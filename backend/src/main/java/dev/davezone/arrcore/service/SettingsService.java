package dev.davezone.arrcore.service;

import dev.davezone.arrcore.config.CryptoUtils;
import dev.davezone.arrcore.config.ServiceSettings;
import dev.davezone.arrcore.config.ServiceSettingsRepository;
import dev.davezone.arrcore.dto.AllSettingsDTO;
import dev.davezone.arrcore.dto.ServiceSettingsDTO;
import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class SettingsService {

    private static final String MASKED = "••••••••";
    private static final List<String> SERVICE_NAMES = List.of("sonarr", "radarr", "seerr", "portainer", "qbittorrent");
    private static final List<String> API_KEY_SERVICES = List.of("sonarr", "radarr", "seerr", "portainer");

    private final ServiceSettingsRepository repository;
    private final String encryptionKey;
    private final WebClient webClient;

    public SettingsService(ServiceSettingsRepository repository,
                           @Value("${settings.encryption-key}") String encryptionKey,
                           WebClient webClient) {
        this.repository = repository;
        this.encryptionKey = encryptionKey;
        this.webClient = webClient;
    }

    public Mono<AllSettingsDTO> getAllSettings() {
        return repository.findAll()
                .collectList()
                .map(list -> {
                    Map<String, ServiceSettingsDTO> services = new LinkedHashMap<>();
                    for (String name : SERVICE_NAMES) {
                        ServiceSettings entity = list.stream()
                                .filter(s -> s.getServiceName().equals(name))
                                .findFirst()
                                .orElse(null);
                        services.put(name, toMaskedDTO(name, entity));
                    }
                    return new AllSettingsDTO(services);
                });
    }

    public Mono<ServiceSettingsDTO> saveServiceSettings(String serviceName, ServiceSettingsDTO dto) {
        return repository.findByServiceName(serviceName)
                .defaultIfEmpty(newEntity(serviceName))
                .flatMap(entity -> {
                    entity.setUrl(dto.getUrl());
                    entity.setApiKey(encryptIfNotMasked(dto.getApiKey(), entity.getApiKey()));
                    entity.setUsername(encryptIfNotMasked(dto.getUsername(), entity.getUsername()));
                    entity.setPassword(encryptIfNotMasked(dto.getPassword(), entity.getPassword()));
                    entity.setUpdatedAt(LocalDateTime.now());
                    return repository.save(entity);
                })
                .map(entity -> toMaskedDTO(serviceName, entity));
    }

    public Mono<AllSettingsDTO> saveAllSettings(AllSettingsDTO dto) {
        return Flux.fromIterable(dto.getServices().entrySet())
                .flatMap(entry -> saveServiceSettings(entry.getKey(), entry.getValue()))
                .then(getAllSettings());
    }

    public Mono<Boolean> testConnection(String serviceName) {
        return repository.findByServiceName(serviceName)
                .map(entity -> entity.getUrl() != null && !entity.getUrl().isBlank())
                .defaultIfEmpty(false);
    }

    public Mono<String> getDecryptedUrl(String serviceName) {
        return repository.findByServiceName(serviceName)
                .map(ServiceSettings::getUrl);
    }

    public Mono<String> getDecryptedApiKey(String serviceName) {
        return repository.findByServiceName(serviceName)
                .map(entity -> CryptoUtils.decrypt(entity.getApiKey(), encryptionKey));
    }

    public Mono<String> getDecryptedUsername(String serviceName) {
        return repository.findByServiceName(serviceName)
                .map(entity -> CryptoUtils.decrypt(entity.getUsername(), encryptionKey));
    }

    public Mono<String> getDecryptedPassword(String serviceName) {
        return repository.findByServiceName(serviceName)
                .map(entity -> CryptoUtils.decrypt(entity.getPassword(), encryptionKey));
    }

    public Mono<Boolean> testAndSave(String serviceName, ServiceSettingsDTO dto) {
        return validateSettings(serviceName, dto)
                .flatMap(ok -> ok ? saveServiceSettings(serviceName, dto).thenReturn(true) : Mono.just(false));
    }

    private Mono<Boolean> validateSettings(String serviceName, ServiceSettingsDTO dto) {
        if (!isDtoConfigured(serviceName, dto)) {
            return Mono.just(false);
        }
        String baseUrl = normalizeBaseUrl(dto.getUrl());
        if (API_KEY_SERVICES.contains(serviceName)) {
            return validateApiKeyService(serviceName, baseUrl, dto.getApiKey());
        }
        if ("qbittorrent".equals(serviceName)) {
            return validateQbittorrent(baseUrl, dto.getUsername(), dto.getPassword());
        }
        if ("grafana".equals(serviceName)) {
            return validateGrafana(baseUrl);
        }
        return Mono.just(false);
    }

    private Mono<Boolean> validateGrafana(String baseUrl) {
        return webClient.get()
                .uri(baseUrl)
                .exchangeToMono(response -> Mono.just(response.statusCode().is2xxSuccessful()))
                .onErrorReturn(false);
    }

    private Mono<Boolean> validateApiKeyService(String serviceName, String baseUrl, String apiKey) {
        String path;
        String headerName = "X-Api-Key";
        if ("sonarr".equals(serviceName) || "radarr".equals(serviceName)) {
            path = "/ping";
        } else if ("seerr".equals(serviceName)) {
            path = "/api/v1/status";
        } else if ("portainer".equals(serviceName)) {
            path = "/api/endpoints";
            headerName = "X-API-Key";
        } else {
            return Mono.just(false);
        }
        String url = baseUrl + path;
        return webClient.get()
                .uri(url)
                .header(headerName, apiKey)
                .exchangeToMono(response -> Mono.just(response.statusCode().is2xxSuccessful()))
                .onErrorReturn(false);
    }

    private Mono<Boolean> validateQbittorrent(String baseUrl, String username, String password) {
        String url = baseUrl + "/api/v2/auth/login";
        return webClient.post()
                .uri(url)
                .body(BodyInserters.fromFormData("username", username)
                        .with("password", password))
                .exchangeToMono(response -> response.bodyToMono(String.class)
                        .defaultIfEmpty("")
                        .map(body -> response.statusCode().is2xxSuccessful()
                                && body.trim().equalsIgnoreCase("Ok.")))
                .onErrorReturn(false);
    }

    private String normalizeBaseUrl(String url) {
        if (url == null) {
            return "";
        }
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }

    private boolean isDtoConfigured(String serviceName, ServiceSettingsDTO dto) {
        if (dto == null || dto.getUrl() == null || dto.getUrl().isBlank()) {
            return false;
        }
        if (API_KEY_SERVICES.contains(serviceName)) {
            return dto.getApiKey() != null && !dto.getApiKey().isBlank();
        }
        if ("qbittorrent".equals(serviceName)) {
            return dto.getUsername() != null && !dto.getUsername().isBlank()
                    && dto.getPassword() != null && !dto.getPassword().isBlank();
        }
        return true;
    }

    /**
     * Seeds initial settings from .env file if DB is empty.
     */
    public Mono<Void> seedFromEnvIfEmpty() {
        return repository.count().flatMap(count -> {
            if (count > 0) return Mono.empty();
            try {
                Dotenv dotenv = Dotenv.configure().ignoreIfMissing().load();
                return Flux.concat(
                        seedService("sonarr", dotenv.get("SONARR_URL"), dotenv.get("SONARR_API_KEY"), null, null),
                        seedService("radarr", dotenv.get("RADARR_URL"), dotenv.get("RADARR_API_KEY"), null, null),
                        seedService("seerr", dotenv.get("SEERR_URL"), dotenv.get("SEERR_API_KEY"), null, null),
                        seedService("portainer", dotenv.get("PORTAINER_URL"), dotenv.get("PORTAINER_API_KEY"), null, null),
                        seedService("qbittorrent", dotenv.get("QBITTORRENT_URL"), null, dotenv.get("QBITTORRENT_USERNAME"), dotenv.get("QBITTORRENT_PASSWORD"))
                ).then();
            } catch (Exception e) {
                return Mono.empty();
            }
        });
    }

    private Mono<ServiceSettings> seedService(String name, String url, String apiKey, String username, String password) {
        if (url == null || url.isBlank()) return Mono.empty();
        ServiceSettings entity = newEntity(name);
        entity.setUrl(url);
        entity.setApiKey(apiKey != null ? CryptoUtils.encrypt(apiKey, encryptionKey) : null);
        entity.setUsername(username != null ? CryptoUtils.encrypt(username, encryptionKey) : null);
        entity.setPassword(password != null ? CryptoUtils.encrypt(password, encryptionKey) : null);
        return repository.save(entity);
    }

    private ServiceSettings newEntity(String serviceName) {
        ServiceSettings entity = new ServiceSettings();
        entity.setServiceName(serviceName);
        entity.setCreatedAt(LocalDateTime.now());
        entity.setUpdatedAt(LocalDateTime.now());
        return entity;
    }

    private ServiceSettingsDTO toMaskedDTO(String serviceName, ServiceSettings entity) {
        ServiceSettingsDTO dto = new ServiceSettingsDTO();
        dto.setServiceName(serviceName);
        if (entity == null) {
            dto.setConfigured(false);
            return dto;
        }
        dto.setUrl(entity.getUrl());
        dto.setApiKey(entity.getApiKey() != null ? MASKED : null);
        dto.setUsername(entity.getUsername() != null ? MASKED : null);
        dto.setPassword(entity.getPassword() != null ? MASKED : null);
        dto.setConfigured(entity.getUrl() != null && !entity.getUrl().isBlank());
        return dto;
    }

    private String encryptIfNotMasked(String newValue, String existingEncrypted) {
        if (newValue == null || newValue.isBlank()) return null;
        if (MASKED.equals(newValue)) return existingEncrypted;
        return CryptoUtils.encrypt(newValue, encryptionKey);
    }
}
