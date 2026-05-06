package dev.davezone.arrcore.controller;

import dev.davezone.arrcore.dto.AddTorrentRequest;
import dev.davezone.arrcore.dto.TorrentDto;
import dev.davezone.arrcore.service.QbittorrentService;
import lombok.AllArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;

import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/qbittorrent")
@AllArgsConstructor
public class QbittorrentController {

    private final QbittorrentService qbittorrentService;

    @GetMapping("/torrents")
    public Flux<TorrentDto> getTorrents() {
        return qbittorrentService.getAllTorrents();
    }

    @PostMapping("/torrents/add")
    public Mono<String> addTorrent(@RequestBody AddTorrentRequest request) {
        return qbittorrentService.addTorrent(request);
    }

    @GetMapping("/categories")
    public Flux<String> getCategories() {
        return qbittorrentService.getAllCategories();
    }

    @PostMapping(
            value = "/torrents/add-form",
            consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE
    )
    public Mono<String> addTorrentFormUrlEncoded(@RequestParam MultiValueMap<String, String> form) {
        return qbittorrentService.addTorrentForm(form);
    }

    @PostMapping(
            value = "/torrents/add-form",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public Mono<String> addTorrentFormMultipart(
            @RequestPart("urls") String urls,
            @RequestPart(value = "savepath", required = false) String savepath,
            @RequestPart(value = "cookie", required = false) String cookie,
            @RequestPart(value = "category", required = false) String category,
            @RequestPart(value = "tags", required = false) String tags,
            @RequestPart(value = "skip_checking", required = false) String skipChecking,
            @RequestPart(value = "paused", required = false) String paused,
            @RequestPart(value = "root_folder", required = false) String rootFolder,
            @RequestPart(value = "rename", required = false) String rename,
            @RequestPart(value = "upLimit", required = false) String upLimit,
            @RequestPart(value = "dlLimit", required = false) String dlLimit,
            @RequestPart(value = "ratioLimit", required = false) String ratioLimit,
            @RequestPart(value = "seedingTimeLimit", required = false) String seedingTimeLimit,
            @RequestPart(value = "autoTMM", required = false) String autoTmm,
            @RequestPart(value = "sequentialDownload", required = false) String sequentialDownload,
            @RequestPart(value = "firstLastPiecePrio", required = false) String firstLastPiecePrio
    ) {
        MultiValueMap<String, String> form = new org.springframework.util.LinkedMultiValueMap<>();
        form.add("urls", urls);
        addIfPresent(form, "savepath", savepath);
        addIfPresent(form, "cookie", cookie);
        addIfPresent(form, "category", category);
        addIfPresent(form, "tags", tags);
        addIfPresent(form, "skip_checking", skipChecking);
        addIfPresent(form, "paused", paused);
        addIfPresent(form, "root_folder", rootFolder);
        addIfPresent(form, "rename", rename);
        addIfPresent(form, "upLimit", upLimit);
        addIfPresent(form, "dlLimit", dlLimit);
        addIfPresent(form, "ratioLimit", ratioLimit);
        addIfPresent(form, "seedingTimeLimit", seedingTimeLimit);
        addIfPresent(form, "autoTMM", autoTmm);
        addIfPresent(form, "sequentialDownload", sequentialDownload);
        addIfPresent(form, "firstLastPiecePrio", firstLastPiecePrio);
        return qbittorrentService.addTorrentForm(form);
    }

    private void addIfPresent(MultiValueMap<String, String> form, String key, String value) {
        if (value != null && !value.isBlank()) {
            form.add(key, value);
        }
    }
}
