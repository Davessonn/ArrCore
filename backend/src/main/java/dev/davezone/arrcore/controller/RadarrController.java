package dev.davezone.arrcore.controller;

import dev.davezone.arrcore.dto.RadarrDTO;
import dev.davezone.arrcore.service.RadarrService;
import lombok.AllArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

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
    public Mono<Void> deleteMovie(Long id) {
        return radarrService.deleteMovie(id);
    }
}
