package dev.davezone.arrcore.controller;

import dev.davezone.arrcore.dto.RadarrDTO;
import dev.davezone.arrcore.dto.RootFolderDto;
import dev.davezone.arrcore.dto.TagDto;
import dev.davezone.arrcore.service.RadarrService;
import lombok.AllArgsConstructor;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/radarr")
@AllArgsConstructor
public class RadarrController {

    private final RadarrService radarrService;

    @GetMapping("/movies")
    public Flux<RadarrDTO> getAllMovies() {
        return radarrService.getAllMovies();
    }

    @DeleteMapping("/movies/{id}")
    public Mono<Void> deleteMovie(@PathVariable Long id) {
        return radarrService.deleteMovie(id);
    }

    @GetMapping("/rootFolders")
    public Flux<RootFolderDto> getRootFolders() {
        return radarrService.getRootFolders();
    }

    @PutMapping("/movies/{id}")
    public Mono<Map<String, Object>> updateMovie(
            @PathVariable Long id,
            @RequestBody Map<String, Object> movie,
            @RequestParam(defaultValue = "false") boolean moveFiles
    ) {
        return radarrService.updateMovie(id, movie, moveFiles);
    }

    @GetMapping("/tags")
    public Flux<TagDto> getTags() {
        return radarrService.getTags();
    }

    @GetMapping("/release")
    public Mono<List<Map<String, Object>>> searchReleases(@RequestParam Long movieId) {
        return radarrService.searchReleases(movieId).collectList();
    }

    @PostMapping("/release")
    public Mono<Map<String, Object>> grabRelease(@RequestBody Map<String, Object> releasePayload) {
        return radarrService.grabRelease(releasePayload);
    }
}
