package dev.davezone.arrcore.service;

import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.MultiValueMap;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.util.UriComponentsBuilder;
import reactor.core.publisher.Mono;

import java.net.URI;
import java.util.List;
import java.util.Map;

@Service
public class SeerrService {

    private static final String SERVICE_NAME = "seerr";
    private final WebClient webClient;
    private final SettingsService settingsService;

    private static final ParameterizedTypeReference<Map<String, Object>> MAP_TYPE =
            new ParameterizedTypeReference<>() {};
    private static final ParameterizedTypeReference<List<Map<String, Object>>> LIST_OF_MAP_TYPE =
            new ParameterizedTypeReference<>() {};

    public SeerrService(WebClient webClient, SettingsService settingsService) {
        this.webClient = webClient;
        this.settingsService = settingsService;
    }

    private Mono<String[]> getCredentials() {
        return Mono.zip(
                settingsService.getDecryptedUrl(SERVICE_NAME),
                settingsService.getDecryptedApiKey(SERVICE_NAME)
        ).map(tuple -> new String[]{tuple.getT1(), tuple.getT2()});
    }

    private URI buildUri(String baseUrl, String path, MultiValueMap<String, String> queryParams) {
        return UriComponentsBuilder.fromUriString(baseUrl + path)
                .queryParams(queryParams)
                .build()
                .toUri();
    }

    private Mono<Throwable> handleError(org.springframework.web.reactive.function.client.ClientResponse response) {
        return response.bodyToMono(String.class)
                .defaultIfEmpty("")
                .map(body -> new RuntimeException(
                        "Seerr error: " + response.statusCode() + " body: " + body
                ));
    }

    public Mono<Map<String, Object>> getUsers(MultiValueMap<String, String> queryParams) {
        return getCredentials().flatMap(creds ->
                webClient.get()
                        .uri(buildUri(creds[0], "/api/v1/user", queryParams))
                        .header("X-Api-Key", creds[1])
                        .accept(MediaType.APPLICATION_JSON)
                        .retrieve()
                        .onStatus(HttpStatusCode::isError, this::handleError)
                        .bodyToMono(MAP_TYPE)
        );
    }

    public Mono<Map<String, Object>> getRequests(MultiValueMap<String, String> queryParams) {
        return getCredentials().flatMap(creds ->
                webClient.get()
                        .uri(buildUri(creds[0], "/api/v1/request", queryParams))
                        .header("X-Api-Key", creds[1])
                        .accept(MediaType.APPLICATION_JSON)
                        .retrieve()
                        .onStatus(HttpStatusCode::isError, this::handleError)
                        .bodyToMono(MAP_TYPE)
        );
    }

    public Mono<Map<String, Object>> createRequest(Map<String, Object> body) {
        return getCredentials().flatMap(creds ->
                webClient.post()
                        .uri(creds[0] + "/api/v1/request")
                        .header("X-Api-Key", creds[1])
                        .contentType(MediaType.APPLICATION_JSON)
                        .accept(MediaType.APPLICATION_JSON)
                        .bodyValue(body)
                        .retrieve()
                        .onStatus(HttpStatusCode::isError, this::handleError)
                        .bodyToMono(MAP_TYPE)
        );
    }

    public Mono<Map<String, Object>> search(MultiValueMap<String, String> queryParams) {
        return getCredentials().flatMap(creds ->
                webClient.get()
                        .uri(buildUri(creds[0], "/api/v1/search", queryParams))
                        .header("X-Api-Key", creds[1])
                        .accept(MediaType.APPLICATION_JSON)
                        .retrieve()
                        .onStatus(HttpStatusCode::isError, this::handleError)
                        .bodyToMono(MAP_TYPE)
        );
    }

    public Mono<Map<String, Object>> getTvDetails(Long id) {
        return getCredentials().flatMap(creds ->
                webClient.get()
                        .uri(creds[0] + "/api/v1/tv/{id}", id)
                        .header("X-Api-Key", creds[1])
                        .accept(MediaType.APPLICATION_JSON)
                        .retrieve()
                        .onStatus(HttpStatusCode::isError, this::handleError)
                        .bodyToMono(MAP_TYPE)
        );
    }

    public Mono<Map<String, Object>> getMovieDetails(Long id) {
        return getCredentials().flatMap(creds ->
                webClient.get()
                        .uri(creds[0] + "/api/v1/movie/{id}", id)
                        .header("X-Api-Key", creds[1])
                        .accept(MediaType.APPLICATION_JSON)
                        .retrieve()
                        .onStatus(HttpStatusCode::isError, this::handleError)
                        .bodyToMono(MAP_TYPE)
        );
    }

    public Mono<List<Map<String, Object>>> getRadarrService() {
        return getCredentials().flatMap(creds ->
                webClient.get()
                        .uri(creds[0] + "/api/v1/service/radarr")
                        .header("X-Api-Key", creds[1])
                        .accept(MediaType.APPLICATION_JSON)
                        .retrieve()
                        .onStatus(HttpStatusCode::isError, this::handleError)
                        .bodyToMono(LIST_OF_MAP_TYPE)
        );
    }

    public Mono<Map<String, Object>> getDefaultRadarrService() {
        return getRadarrService()
                .flatMap(this::extractRadarrServiceId)
                .flatMap(this::getRadarrServiceById);
    }

    public Mono<Map<String, Object>> getRadarrServiceById(Long id) {
        return getCredentials().flatMap(creds ->
                webClient.get()
                        .uri(creds[0] + "/api/v1/service/radarr/{id}", id)
                        .header("X-Api-Key", creds[1])
                        .accept(MediaType.APPLICATION_JSON)
                        .retrieve()
                        .onStatus(HttpStatusCode::isError, this::handleError)
                        .bodyToMono(MAP_TYPE)
        );
    }

    private Mono<Long> extractRadarrServiceId(List<Map<String, Object>> radarrServices) {
        if (radarrServices == null || radarrServices.isEmpty()) {
            return Mono.error(new IllegalStateException("No Radarr service configured in Seerr"));
        }

        Map<String, Object> selectedService = radarrServices.stream()
                .filter(service -> Boolean.TRUE.equals(service.get("isDefault")))
                .findFirst()
                .orElse(radarrServices.get(0));

        Object idValue = selectedService.get("id");
        if (idValue instanceof Number number) {
            return Mono.just(number.longValue());
        }
        if (idValue instanceof String stringValue && !stringValue.isBlank()) {
            try {
                return Mono.just(Long.parseLong(stringValue));
            } catch (NumberFormatException ignored) {
                return Mono.error(new IllegalStateException("Invalid Radarr service id from Seerr: " + stringValue));
            }
        }

        return Mono.error(new IllegalStateException("Missing Radarr service id in Seerr response"));
    }
}
