package dev.davezone.arrcore.service;

import dev.davezone.arrcore.dto.SonarrSeriesDto;
import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Service
public class SonarrService {


    private static final String ALL_SERIES_API_PATH = "api/v3/series";
    private static final String DELETE_SERIES_API_PATH = "api/v3/series/{id}";
    private static final String GET_SERIES_BY_ID_API_PATH = "api/v3/series/{id}";

    private String apiKey;

    private String sonarrUrl;

    private final WebClient webClient;

    public SonarrService(WebClient webClient) {
        Dotenv dotenv = Dotenv.load();

        this.apiKey = dotenv.get("SONARR_API_KEY");
        this.sonarrUrl = dotenv.get("SONARR_URL");
        this.webClient = webClient;

        if (this.apiKey == null || this.sonarrUrl == null) {
            throw new IllegalStateException("Missing required environment variables: SONARR_API_KEY and SONARR_URL must be set.");
        }
    }

    public Flux<SonarrSeriesDto> getAllSeries() {
        return webClient.get()
                .uri(sonarrUrl + ALL_SERIES_API_PATH)
                .header("X-Api-Key", apiKey)
                .retrieve()
                .bodyToFlux(SonarrSeriesDto.class);
    }

    public void deleteSeries(Long id) {
        webClient.delete()
                .uri(sonarrUrl + DELETE_SERIES_API_PATH, id)
                .header("X-Api-Key", apiKey)
                .retrieve()
                .bodyToMono(Void.class)
                .block();
    }

    public Flux<SonarrSeriesDto> getSeriesById(Long id) {
        return webClient.get()
                .uri(sonarrUrl + GET_SERIES_BY_ID_API_PATH, id)
                .header("X-Api-Key", apiKey)
                .retrieve()
                .bodyToFlux(SonarrSeriesDto.class);
    }
}
