package dev.davezone.arrcore.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class RadarrRatingsDTO {
    @JsonProperty("imdb")
    private RadarrRatingSourceDTO imdb;
    @JsonProperty("tmdb")
    private RadarrRatingSourceDTO tmdb;
    @JsonProperty("metacritic")
    private RadarrRatingSourceDTO metacritic;
    @JsonProperty("rottenTomatoes")
    private RadarrRatingSourceDTO rottenTomatoes;
    @JsonProperty("trakt")
    private RadarrRatingSourceDTO trakt;
}

