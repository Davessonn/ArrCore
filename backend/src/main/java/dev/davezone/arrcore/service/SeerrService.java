package dev.davezone.arrcore.service;

import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.MultiValueMap;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.util.UriComponentsBuilder;
import reactor.core.publisher.Mono;

import java.net.URI;
import java.util.Map;

@Service
public class SeerrService {

    private final String seerrUrl;
    private final String apiKey;
    private final WebClient webClient;

    private static final ParameterizedTypeReference<Map<String, Object>> MAP_TYPE =
            new ParameterizedTypeReference<>() {};

    public SeerrService(WebClient webClient) {
        Dotenv dotenv = Dotenv.load();

        this.seerrUrl = dotenv.get("SEERR_URL");
        this.apiKey = dotenv.get("SEERR_API_KEY");
        this.webClient = webClient;

        if (this.seerrUrl == null || this.apiKey == null) {
            throw new IllegalStateException("Missing required environment variables: SEERR_URL and SEERR_API_KEY must be set.");
        }
    }

    private URI buildUri(String path, MultiValueMap<String, String> queryParams) {
        return UriComponentsBuilder.fromUriString(seerrUrl + path)
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

    /**
     * GET /api/v1/user?take=50&skip=0
     */
    public Mono<Map<String, Object>> getUsers(MultiValueMap<String, String> queryParams) {
        return webClient.get()
                .uri(buildUri("/api/v1/user", queryParams))
                .header("X-Api-Key", apiKey)
                .accept(MediaType.APPLICATION_JSON)
                .retrieve()
                .onStatus(HttpStatusCode::isError, this::handleError)
                .bodyToMono(MAP_TYPE);
    }

    /**
     * GET /api/v1/request?take=...&skip=...&sort=...&requestedBy=...
     */
    public Mono<Map<String, Object>> getRequests(MultiValueMap<String, String> queryParams) {
        return webClient.get()
                .uri(buildUri("/api/v1/request", queryParams))
                .header("X-Api-Key", apiKey)
                .accept(MediaType.APPLICATION_JSON)
                .retrieve()
                .onStatus(HttpStatusCode::isError, this::handleError)
                .bodyToMono(MAP_TYPE);
    }

    /**
     * POST /api/v1/request
     */
    public Mono<Map<String, Object>> createRequest(Map<String, Object> body) {
        return webClient.post()
                .uri(seerrUrl + "/api/v1/request")
                .header("X-Api-Key", apiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.APPLICATION_JSON)
                .bodyValue(body)
                .retrieve()
                .onStatus(HttpStatusCode::isError, this::handleError)
                .bodyToMono(MAP_TYPE);
    }

    /**
     * GET /api/v1/search?query=...&page=...&language=...
     */
    public Mono<Map<String, Object>> search(MultiValueMap<String, String> queryParams) {
        return webClient.get()
                .uri(buildUri("/api/v1/search", queryParams))
                .header("X-Api-Key", apiKey)
                .accept(MediaType.APPLICATION_JSON)
                .retrieve()
                .onStatus(HttpStatusCode::isError, this::handleError)
                .bodyToMono(MAP_TYPE);
    }

    /**
     * GET /api/v1/tv/{id}
     */
    public Mono<Map<String, Object>> getTvDetails(Long id) {
        return webClient.get()
                .uri(seerrUrl + "/api/v1/tv/{id}", id)
                .header("X-Api-Key", apiKey)
                .accept(MediaType.APPLICATION_JSON)
                .retrieve()
                .onStatus(HttpStatusCode::isError, this::handleError)
                .bodyToMono(MAP_TYPE);
    }
}


