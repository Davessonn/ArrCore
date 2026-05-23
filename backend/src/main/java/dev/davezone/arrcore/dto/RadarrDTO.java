package dev.davezone.arrcore.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;

@Data
public class RadarrDTO {
    @JsonProperty("id")
    private int id;
    @JsonProperty("title")
    private String title;
    @JsonProperty("sortTitle")
    private String sortTitle;
    @JsonProperty("tmdbId")
    private int tmdbId;
    @JsonProperty("images")
    private List<ImageDTO> images;
    @JsonProperty("overview")
    private String overview;
    @JsonProperty("monitored")
    private boolean monitored;
    @JsonProperty("rootFolderPath")
    private String rootFolderPath;
    @JsonProperty("qualityProfileId")
    private int qualityProfileId;
    @JsonProperty("searchOnAdd")
    private boolean searchOnAdd;
    @JsonProperty("minimumAvailability")
    private String minimumAvailability;
    @JsonProperty("movies")
    private List<RadarrMovieDTO> movies;
    @JsonProperty("missingMovies")
    private int missingMovies;
    @JsonProperty("tags")
    private List<Integer> tags;
}
