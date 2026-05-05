package dev.davezone.arrcore.service;

import dev.davezone.arrcore.dto.RadarrDTO;
import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;

@Service
public class RadarrService {

    private static final String ALL_MOVIES_API_PATH = "api/v3/collection";
    private static final String DELETE_MOVIE_API_PATH = "api/v3/collection/{id}";
    private static final String GET_MOVIE_BY_ID_API_PATH = "api/v3/collection/{id}";
    private static final String UPDATE_MOVIE_API_PATH = "api/v3/collection/{id}";

    private String apiKey;

    private String radarrUrl;

    private final WebClient webClient;

    public RadarrService(WebClient webClient) {
        Dotenv dotenv = Dotenv.load();

        this.apiKey = dotenv.get("RADARR_API_KEY");
        this.radarrUrl = dotenv.get("RADARR_URL");
        this.webClient = webClient;

        if (this.apiKey == null || this.radarrUrl == null) {
            throw new IllegalStateException("Missing required environment variables: SONARR_API_KEY and SONARR_URL must be set.");
        }
    }

    public Flux<RadarrDTO> getAllMovies() {
        return webClient.get()
                .uri(radarrUrl + ALL_MOVIES_API_PATH)
                .header("X-Api-Key", apiKey)
                .retrieve()
                .bodyToFlux(RadarrDTO.class);
    }
}
