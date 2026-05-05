package dev.davezone.arrcore.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;

@Data
public class RadarrMovieDTO {
    @JsonProperty("tmdbId")
    private int tmdbId;
    @JsonProperty("imdbId")
    private String imdbId;
    @JsonProperty("title")
    private String title;
    @JsonProperty("cleanTitle")
    private String cleanTitle;
    @JsonProperty("sortTitle")
    private String sortTitle;
    @JsonProperty("status")
    private String status;
    @JsonProperty("overview")
    private String overview;
    @JsonProperty("runtime")
    private int runtime;
    @JsonProperty("images")
    private List<ImageDTO> images;
    @JsonProperty("year")
    private int year;
    @JsonProperty("ratings")
    private RadarrRatingsDTO ratings;
    @JsonProperty("genres")
    private List<String> genres;
    @JsonProperty("folder")
    private String folder;
    @JsonProperty("isExisting")
    private boolean isExisting;
    @JsonProperty("isExcluded")
    private boolean isExcluded;
}

