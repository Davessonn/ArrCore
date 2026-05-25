package dev.davezone.arrcore.service;

import dev.davezone.arrcore.dto.RootFolderDto;
import dev.davezone.arrcore.dto.SonarrSeriesDto;
import dev.davezone.arrcore.dto.TagDto;
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
    private static final String GET_ROOT_FOLDERS_API_PATH = "api/v3/rootFolder";
    private static final String GET_TAGS_API_PATH = "api/v3/tag";
    private static final String RELEASE_API_PATH = "api/v3/release";
    private static final String SEARCH_RELEASES_API_PATH = "api/v3/release?seriesId={seriesId}&seasonNumber={seasonNumber}";

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

    public Mono<Map<String, Object>> updateSeries(Long id, Map<String, Object> patch, boolean moveFiles) {
        return getCredentials().flatMap(creds ->
                getSeriesMapById(id, creds).flatMap(existing -> {
                    existing.putAll(patch);
                    existing.put("id", id);
                    String updateSeriesApiPath = creds[0] + UPDATE_SERIES_API_PATH + (moveFiles ? "?moveFiles=true" : "");
                    return webClient.put()
                            .uri(updateSeriesApiPath, id)
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

    public Flux<RootFolderDto> getRootFolders() {
        return getCredentials().flatMapMany(creds ->
                webClient.get()
                        .uri(creds[0] + GET_ROOT_FOLDERS_API_PATH)
                        .header("X-Api-Key", creds[1])
                        .retrieve()
                        .bodyToFlux(RootFolderDto.class)
                        .filter(folder -> folder.getPath() != null && !folder.getPath().isBlank())
        );
    }

    public Flux<TagDto> getTags() {
        return getCredentials().flatMapMany(creds ->
                webClient.get()
                        .uri(creds[0] + GET_TAGS_API_PATH)
                        .header("X-Api-Key", creds[1])
                        .retrieve()
                        .bodyToFlux(TagDto.class)
        );
    }

        public Flux<Map<String, Object>> searchReleases(Long seriesId, Integer seasonNumber) {
        return getCredentials().flatMapMany(creds ->
            webClient.get()
                .uri(creds[0] + SEARCH_RELEASES_API_PATH, seriesId, seasonNumber)
                .header("X-Api-Key", creds[1])
                .accept(MediaType.APPLICATION_JSON)
                .retrieve()
                .bodyToFlux(new ParameterizedTypeReference<Map<String, Object>>() {})
        );
        }

        public Mono<Map<String, Object>> grabRelease(Map<String, Object> releasePayload) {
        return getCredentials().flatMap(creds ->
            webClient.post()
                .uri(creds[0] + RELEASE_API_PATH)
                .header("X-Api-Key", creds[1])
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.APPLICATION_JSON)
                .bodyValue(releasePayload)
                .retrieve()
                .onStatus(HttpStatusCode::isError, response ->
                    response.bodyToMono(String.class)
                        .flatMap(body -> Mono.error(new IllegalStateException(
                            "Sonarr grab failed: " + response.statusCode() + " body: " + body
                        )))
                )
                .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
        );
        }
}
