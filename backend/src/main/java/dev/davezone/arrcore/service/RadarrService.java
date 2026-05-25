package dev.davezone.arrcore.service;

import dev.davezone.arrcore.dto.RadarrDTO;
import dev.davezone.arrcore.dto.RootFolderDto;
import dev.davezone.arrcore.dto.TagDto;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.HashMap;
import java.util.Map;

@Service
public class RadarrService {

    private static final String SERVICE_NAME = "radarr";
    private static final String ALL_MOVIES_API_PATH = "api/v3/movie";
    private static final String DELETE_MOVIE_API_PATH = "api/v3/movie/{id}?deleteFiles=true&addImportListExclusion=false";
    private static final String UPDATE_MOVIE_API_PATH = "api/v3/movie/{id}";
    private static final String GET_ROOT_FOLDERS_API_PATH = "api/v3/rootFolder";
    private static final String GET_TAGS_API_PATH = "api/v3/tag";
    private static final String GET_MOVIE_BY_ID_API_PATH = "api/v3/movie/{id}";
    private static final String GET_INDEXERS_API_PATH = "api/v3/indexer";
    private static final String RELEASE_API_PATH = "api/v3/release";
    private static final String RELEASE_SEARCH_API_PATH = "api/v3/release?movieId={id}";

    private final WebClient webClient;
    private final SettingsService settingsService;

    public RadarrService(WebClient webClient, SettingsService settingsService) {
        this.webClient = webClient;
        this.settingsService = settingsService;
    }

    private Mono<String[]> getCredentials() {
        return Mono.zip(
                settingsService.getDecryptedUrl(SERVICE_NAME),
                settingsService.getDecryptedApiKey(SERVICE_NAME)
        ).map(tuple -> new String[]{tuple.getT1(), tuple.getT2()});
    }

    public Flux<RadarrDTO> getAllMovies() {
        return getCredentials().flatMapMany(creds ->
                webClient.get()
                        .uri(creds[0] + ALL_MOVIES_API_PATH)
                        .header("X-Api-Key", creds[1])
                        .retrieve()
                        .bodyToFlux(RadarrDTO.class)
        );
    }

    public Mono<Void> deleteMovie(Long id) {
        return getCredentials().flatMap(creds ->
                webClient.delete()
                        .uri(creds[0] + DELETE_MOVIE_API_PATH, id)
                        .header("X-Api-Key", creds[1])
                        .retrieve()
                        .bodyToMono(Void.class)
        );
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

    public Mono<Map<String, Object>> updateMovie(Long id, Map<String, Object> movie, boolean moveFiles) {
        return getCredentials().flatMap(creds ->
                getMovieMapById(id, creds).flatMap(existing -> {
                    String originalRootFolderPath = getStringValue(existing.get("rootFolderPath"));
                    String currentPath = getStringValue(existing.get("path"));

                    existing.putAll(movie);
                    existing.put("id", id);
                    String updatedRootFolderPath = getStringValue(existing.get("rootFolderPath"));

                    if (!updatedRootFolderPath.isBlank() && !updatedRootFolderPath.equals(originalRootFolderPath)) {
                        existing.put("path", rebuildMoviePath(updatedRootFolderPath, currentPath));
                    }

                    String updateSeriesApiPath = creds[0] + UPDATE_MOVIE_API_PATH + (moveFiles ? "?moveFiles=true" : "");
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
                                                    "Radarr update failed: " + response.statusCode() + " body: " + body
                                            )))
                            )
                            .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {});
                })
        );
    }

    private String rebuildMoviePath(String rootFolderPath, String currentPath) {
        if (rootFolderPath == null || rootFolderPath.isBlank()) {
            throw new IllegalStateException("Radarr update failed: rootFolderPath is missing");
        }
        if (currentPath == null || currentPath.isBlank()) {
            throw new IllegalStateException("Radarr update failed: existing movie path is missing");
        }

        String folderName = getLastPathPart(currentPath);
        if (folderName.isBlank()) {
            throw new IllegalStateException("Radarr update failed: could not determine movie folder name from existing path");
        }

        return joinPath(rootFolderPath, folderName);
    }

    private String getLastPathPart(String path) {
        String normalizedPath = path.replace('\\', '/');
        int index = normalizedPath.lastIndexOf('/');
        return index >= 0 ? normalizedPath.substring(index + 1) : normalizedPath;
    }

    private String joinPath(String parentPath, String childPath) {
        String separator = parentPath.contains("\\") && !parentPath.contains("/") ? "\\" : "/";
        return parentPath.replaceAll("[\\\\/]+$", "") + separator + childPath;
    }

    private String getStringValue(Object value) {
        return value instanceof String stringValue ? stringValue : "";
    }

    private Mono<Map<String, Object>> getMovieMapById(Long id, String[] creds) {
        return webClient.get()
                .uri(creds[0] + GET_MOVIE_BY_ID_API_PATH, id)
                .header("X-Api-Key", creds[1])
                .accept(MediaType.APPLICATION_JSON)
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {});
    }

    public Flux<Map<String, Object>> searchReleases(Long movieId) {
        return getCredentials().flatMapMany(creds ->
                getIndexerIdsByName(creds).flatMapMany(indexerIdsByName ->
                        webClient.get()
                                .uri(creds[0] + RELEASE_SEARCH_API_PATH, movieId)
                                .header("X-Api-Key", creds[1])
                                .accept(MediaType.APPLICATION_JSON)
                                .retrieve()
                                .bodyToFlux(new ParameterizedTypeReference<Map<String, Object>>() {})
                                .map(release -> withResolvedIndexerId(release, indexerIdsByName))
                )
        );
    }

    public Mono<Map<String, Object>> grabRelease(Map<String, Object> releasePayload) {
        return getCredentials().flatMap(creds ->
                resolveReleasePayload(releasePayload, creds).flatMap(resolvedPayload ->
                        webClient.post()
                                .uri(creds[0] + RELEASE_API_PATH)
                                .header("X-Api-Key", creds[1])
                                .contentType(MediaType.APPLICATION_JSON)
                                .accept(MediaType.APPLICATION_JSON)
                                .bodyValue(resolvedPayload)
                                .retrieve()
                                .onStatus(HttpStatusCode::isError, response ->
                                        response.bodyToMono(String.class)
                                                .flatMap(body -> Mono.error(new IllegalStateException(
                                                        "Radarr grab failed: " + response.statusCode() + " body: " + body
                                                )))
                                )
                                .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                )
        );
    }

    private Mono<Map<String, Long>> getIndexerIdsByName(String[] creds) {
        return webClient.get()
                .uri(creds[0] + GET_INDEXERS_API_PATH)
                .header("X-Api-Key", creds[1])
                .accept(MediaType.APPLICATION_JSON)
                .retrieve()
                .bodyToFlux(new ParameterizedTypeReference<Map<String, Object>>() {})
                .collect(HashMap<String, Long>::new, (indexerIdsByName, indexer) -> {
                    String indexerName = getStringValue(indexer.get("name"));
                    long indexerId = getLongValue(indexer.get("id"));
                    if (!indexerName.isBlank() && indexerId > 0) {
                        indexerIdsByName.put(indexerName, indexerId);
                    }
                });
    }

    private Mono<Map<String, Object>> resolveReleasePayload(Map<String, Object> releasePayload, String[] creds) {
        long indexerId = getLongValue(releasePayload.get("indexerId"));
        if (indexerId > 0) {
            return Mono.just(releasePayload);
        }

        return getIndexerIdsByName(creds).map(indexerIdsByName -> {
            Map<String, Object> resolvedPayload = withResolvedIndexerId(releasePayload, indexerIdsByName);
            long resolvedIndexerId = getLongValue(resolvedPayload.get("indexerId"));
            if (resolvedIndexerId <= 0) {
                throw new IllegalStateException("Radarr grab failed: could not resolve indexerId for release '"
                        + getStringValue(releasePayload.get("title")) + "'");
            }
            return resolvedPayload;
        });
    }

    private Map<String, Object> withResolvedIndexerId(
            Map<String, Object> release,
            Map<String, Long> indexerIdsByName
    ) {
        long currentIndexerId = getLongValue(release.get("indexerId"));
        if (currentIndexerId > 0) {
            return release;
        }

        String indexerName = getStringValue(release.get("indexer"));
        Long resolvedIndexerId = indexerIdsByName.get(indexerName);
        if (resolvedIndexerId == null || resolvedIndexerId <= 0) {
            return release;
        }

        Map<String, Object> resolvedRelease = new HashMap<>(release);
        resolvedRelease.put("indexerId", resolvedIndexerId);
        return resolvedRelease;
    }

    private long getLongValue(Object value) {
        if (value instanceof Number numberValue) {
            return numberValue.longValue();
        }
        if (value instanceof String stringValue) {
            try {
                return Long.parseLong(stringValue);
            } catch (NumberFormatException ignored) {
                return 0L;
            }
        }
        return 0L;
    }
}
