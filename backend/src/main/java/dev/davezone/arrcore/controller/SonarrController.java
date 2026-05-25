package dev.davezone.arrcore.controller;

import dev.davezone.arrcore.dto.RootFolderDto;
import dev.davezone.arrcore.dto.SonarrSeriesDto;
import dev.davezone.arrcore.dto.TagDto;
import dev.davezone.arrcore.service.SonarrService;
import lombok.AllArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/sonarr")
@AllArgsConstructor
public class SonarrController {

    private final SonarrService sonarrService;


    @GetMapping("/series")
    public Flux<SonarrSeriesDto> getAllSeries() {
        return sonarrService.getAllSeries();
    }

    @DeleteMapping("/series/{id}")
    public Mono<Void> deleteSeries(@PathVariable Long id) {
        return sonarrService.deleteSeries(id);
    }

    @GetMapping("/series/{id}")
    public Flux<SonarrSeriesDto> getSeriesById(@PathVariable Long id) {
        return sonarrService.getSeriesById(id);
    }

    @PutMapping("/series/{id}")
    public Mono<Map<String, Object>> updateSeries(
            @PathVariable Long id,
            @RequestBody Map<String, Object> series,
            @RequestParam(defaultValue = "false") boolean moveFiles
    ) {
        return sonarrService.updateSeries(id, series, moveFiles);
    }

    @GetMapping("/rootFolders")
    public Flux<RootFolderDto> getRootFolders() {
        return sonarrService.getRootFolders();
    }

    @GetMapping("/tags")
    public Flux<TagDto> getTags() {
        return sonarrService.getTags();
    }

    @GetMapping("/release")
    public Mono<List<Map<String, Object>>> searchReleases(
            @RequestParam Long seriesId,
            @RequestParam Integer seasonNumber
    ) {
        return sonarrService.searchReleases(seriesId, seasonNumber).collectList();
    }

    @PostMapping("/release")
    public Mono<Map<String, Object>> grabRelease(@RequestBody Map<String, Object> releasePayload) {
        return sonarrService.grabRelease(releasePayload);
    }
}
