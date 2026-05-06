package dev.davezone.arrcore.service;

import dev.davezone.arrcore.dto.AddTorrentRequest;
import dev.davezone.arrcore.dto.TorrentDto;
import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.ClientResponse;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.List;

@Service
public class QbittorrentService {

    private static final String ALL_CATEGORY_API_PATH = "/api/v2/torrents/categories";

    private final String qbittorentUrl;
    private final String qbittorrentUsername;
    private final String qbittorrentPassword;
    private String sessionCookie;

    private final WebClient webClient;

    public QbittorrentService(WebClient webClient) {
        Dotenv dotenv = Dotenv.load();

        this.qbittorentUrl = dotenv.get("QBITTORRENT_URL");
        this.qbittorrentUsername = dotenv.get("QBITTORRENT_USERNAME");
        this.qbittorrentPassword = dotenv.get("QBITTORRENT_PASSWORD");
        this.webClient = webClient;
    }

    public Mono<String> login() {
        return webClient.post()
                .uri(qbittorentUrl + "/api/v2/auth/login")
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(BodyInserters.fromFormData("username", qbittorrentUsername)
                        .with("password", qbittorrentPassword))
                .exchangeToMono(this::extractSessionCookie)
                .doOnNext(cookie -> this.sessionCookie = cookie);
    }

    private Mono<String> extractSessionCookie(ClientResponse response) {
        return response.bodyToMono(String.class)
                .defaultIfEmpty("")
                .flatMap(body -> {
                    HttpStatusCode status = response.statusCode();
                    List<String> cookies = response.headers().header(HttpHeaders.SET_COOKIE);
                    if (cookies != null && !cookies.isEmpty()) {
                        return Mono.just(cookies.get(0));
                    }
                    return Mono.error(new RuntimeException(
                            "qBittorrent login failed: " + status + " body: " + body
                    ));
                });
    }

    private Mono<String> getSessionCookie() {
        if (sessionCookie != null) {
            return Mono.just(sessionCookie);
        }
        return login();
    }

    public Flux<TorrentDto> getAllTorrents() {
        return getSessionCookie()
                .flatMapMany(cookie -> webClient.get()
                        .uri(qbittorentUrl + "/api/v2/torrents/info")
                        .header(HttpHeaders.COOKIE, cookie)
                        .retrieve()
                        .bodyToFlux(TorrentDto.class));
    }

    public Mono<String> addTorrent(AddTorrentRequest request) {
        if (request.getUrls() == null || request.getUrls().isBlank()) {
            return Mono.error(new IllegalArgumentException("urls is required"));
        }

        MultiValueMap<String, Object> form = new LinkedMultiValueMap<>();
        form.add("urls", request.getUrls());
        addIfPresent(form, "savepath", request.getSavePath());
        addIfPresent(form, "cookie", request.getCookie());
        addIfPresent(form, "category", request.getCategory());
        addIfPresent(form, "tags", request.getTags());
        addIfPresentBool(form, "skip_checking", request.getSkipChecking());
        addIfPresentBool(form, "paused", request.getPaused());
        addIfPresentBool(form, "root_folder", request.getRootFolder());
        addIfPresent(form, "rename", request.getRename());
        addIfPresentNumber(form, "upLimit", request.getUpLimit());
        addIfPresentNumber(form, "dlLimit", request.getDlLimit());
        addIfPresentNumber(form, "ratioLimit", request.getRatioLimit());
        addIfPresentNumber(form, "seedingTimeLimit", request.getSeedingTimeLimit());
        addIfPresentBool(form, "autoTMM", request.getAutoTmm());
        addIfPresentBool(form, "sequentialDownload", request.getSequentialDownload());
        addIfPresentBool(form, "firstLastPiecePrio", request.getFirstLastPiecePrio());

        return postAddTorrent(form);
    }

    public Mono<String> addTorrentForm(MultiValueMap<String, String> formData) {
        String urls = formData.getFirst("urls");
        if (urls == null || urls.isBlank()) {
            return Mono.error(new IllegalArgumentException("urls is required"));
        }

        MultiValueMap<String, Object> form = new LinkedMultiValueMap<>();
        formData.forEach((key, values) -> values.stream()
                .filter(value -> value != null && !value.isBlank())
                .forEach(value -> form.add(key, value)));

        return postAddTorrent(form);
    }

    private Mono<String> postAddTorrent(MultiValueMap<String, Object> form) {
        return getSessionCookie()
                .flatMap(cookie -> webClient.post()
                        .uri(qbittorentUrl + "/api/v2/torrents/add")
                        .header(HttpHeaders.COOKIE, cookie)
                        .contentType(MediaType.MULTIPART_FORM_DATA)
                        .body(BodyInserters.fromMultipartData(form))
                        .retrieve()
                        .bodyToMono(String.class));
    }

    private void addIfPresent(MultiValueMap<String, Object> form, String key, String value) {
        if (value != null && !value.isBlank()) {
            form.add(key, value);
        }
    }

    private void addIfPresentBool(MultiValueMap<String, Object> form, String key, Boolean value) {
        if (value != null) {
            form.add(key, String.valueOf(value));
        }
    }

    private void addIfPresentNumber(MultiValueMap<String, Object> form, String key, Number value) {
        if (value != null) {
            form.add(key, value.toString());
        }
    }

    public Flux<String> getAllCategories() {
        return getSessionCookie()
                .flatMapMany(cookie -> webClient.get()
                        .uri(qbittorentUrl + ALL_CATEGORY_API_PATH)
                        .header(HttpHeaders.COOKIE, cookie)
                        .retrieve()
                        .bodyToFlux(String.class));
    }
}
