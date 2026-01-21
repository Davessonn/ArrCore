package dev.davezone.arrcore.service;

import dev.davezone.arrcore.dto.SonarrSeriesDto;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Service
public class SonarrService {


    private static final String ALL_SERIES_API_PATH = "/api/v3/series";
    private static final String DELETE_SERIES_API_PATH = "/api/v3/series/{id}";
    private static final String GET_SERIES_BY_ID_API_PATH = "/api/v3/series/{id}";

    @Value("${SONARR_API_KEY}")
    private String apiKey;

    @Value("${SONARR_URL}")
    private String sonarrUrl;

    private final WebClient webClient;

    public SonarrService(WebClient webClient) {
        this.webClient = webClient;
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
