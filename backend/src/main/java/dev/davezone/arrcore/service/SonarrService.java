package dev.davezone.arrcore.service;

import dev.davezone.arrcore.dto.SonarrSeriesDto;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.Map;

@Service
public class SonarrService {

    private static final String SERVICE_NAME = "sonarr";
    private static final String ALL_SERIES_API_PATH = "api/v3/series";
    private static final String DELETE_SERIES_API_PATH = "api/v3/series/{id}?deleteFiles=true&addImportListExclusion=false";
    private static final String GET_SERIES_BY_ID_API_PATH = "api/v3/series/{id}";
    private static final String UPDATE_SERIES_API_PATH = "api/v3/series/{id}";

    private final WebClient webClient;
    private final SettingsService settingsService;

    public SonarrService(WebClient webClient, SettingsService settingsService) {
        this.webClient = webClient;
        this.settingsService = settingsService;
    }

    private Mono<String[]> getCredentials() {
        return Mono.zip(
                settingsService.getDecryptedUrl(SERVICE_NAME),
                settingsService.getDecryptedApiKey(SERVICE_NAME)
        ).map(tuple -> new String[]{tuple.getT1(), tuple.getT2()});
    }

    public Flux<SonarrSeriesDto> getAllSeries() {
        return getCredentials().flatMapMany(creds ->
                webClient.get()
                        .uri(creds[0] + ALL_SERIES_API_PATH)
                        .header("X-Api-Key", creds[1])
                        .retrieve()
                        .bodyToFlux(SonarrSeriesDto.class)
        );
    }

    public Mono<Void> deleteSeries(Long id) {
        return getCredentials().flatMap(creds ->
                webClient.delete()
                        .uri(creds[0] + DELETE_SERIES_API_PATH, id)
                        .header("X-Api-Key", creds[1])
                        .retrieve()
                        .bodyToMono(Void.class)
        );
    }

    public Flux<SonarrSeriesDto> getSeriesById(Long id) {
        return getCredentials().flatMapMany(creds ->
                webClient.get()
                        .uri(creds[0] + GET_SERIES_BY_ID_API_PATH, id)
                        .header("X-Api-Key", creds[1])
                        .retrieve()
                        .bodyToFlux(SonarrSeriesDto.class)
        );
    }

    public Mono<Map<String, Object>> updateSeries(Long id, Map<String, Object> patch) {
        return getCredentials().flatMap(creds ->
                getSeriesMapById(id, creds).flatMap(existing -> {
                    existing.putAll(patch);
                    existing.put("id", id);
                    return webClient.put()
                            .uri(creds[0] + UPDATE_SERIES_API_PATH, id)
                            .header("X-Api-Key", creds[1])
                            .contentType(MediaType.APPLICATION_JSON)
                            .accept(MediaType.APPLICATION_JSON)
                            .bodyValue(existing)
                            .retrieve()
                            .onStatus(HttpStatusCode::isError, response ->
                                    response.bodyToMono(String.class)
                                            .flatMap(body -> Mono.error(new IllegalStateException(
                                                    "Sonarr update failed: " + response.statusCode() + " body: " + body
                                            )))
                            )
                            .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {});
                })
        );
    }

    private Mono<Map<String, Object>> getSeriesMapById(Long id, String[] creds) {
        return webClient.get()
                .uri(creds[0] + GET_SERIES_BY_ID_API_PATH, id)
                .header("X-Api-Key", creds[1])
                .accept(MediaType.APPLICATION_JSON)
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {});
    }
}
