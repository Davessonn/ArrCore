package dev.davezone.arrcore.service;

import dev.davezone.arrcore.dto.RadarrDTO;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Service
public class RadarrService {

    private static final String SERVICE_NAME = "radarr";
    private static final String ALL_MOVIES_API_PATH = "api/v3/movie";
    private static final String DELETE_MOVIE_API_PATH = "api/v3/movie/{id}";

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
}
