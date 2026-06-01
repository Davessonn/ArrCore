package dev.davezone.arrcore.controller;

import dev.davezone.arrcore.service.SeerrService;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.util.MultiValueMap;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/seerr")
@AllArgsConstructor
@Validated
public class SeerrController {

    private final SeerrService seerrService;

    @GetMapping("/user")
    public Mono<Map<String, Object>> getUsers(@RequestParam MultiValueMap<String, String> queryParams) {
        return seerrService.getUsers(queryParams);
    }

    @GetMapping("/request")
    public Mono<Map<String, Object>> getRequests(@RequestParam MultiValueMap<String, String> queryParams) {
        return seerrService.getRequests(queryParams);
    }

    @PostMapping("/request")
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<Map<String, Object>> createRequest(@RequestBody Map<String, Object> body) {
        return seerrService.createRequest(body);
    }

    @GetMapping("/search")
    public Mono<Map<String, Object>> search(@RequestParam MultiValueMap<String, String> queryParams) {
        return seerrService.search(queryParams);
    }

    @GetMapping("/tv/{id}")
    public Mono<Map<String, Object>> getTvDetails(@PathVariable Long id) {
        return seerrService.getTvDetails(id);
    }

    @GetMapping("/movie/{id}")
    public Mono<Map<String, Object>> getMovieDetails(@PathVariable Long id) {
        return seerrService.getMovieDetails(id);
    }

    @GetMapping("/service/radarr/default")
    public Mono<Map<String, Object>> getDefaultRadarrService() {
        return seerrService.getDefaultRadarrService();
    }
}

