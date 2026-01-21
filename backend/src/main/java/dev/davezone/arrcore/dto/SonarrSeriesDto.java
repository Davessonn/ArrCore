package dev.davezone.arrcore.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.time.Instant;
import java.util.List;

@Data
public class SonarrSeriesDto {
    @JsonProperty("id")
    private Long id;
    @JsonProperty("title")
    private String title;
    @JsonProperty("status")
    private String status;
    @JsonProperty("overview")
    private String overView;
    @JsonProperty("network")
    private String network;
    @JsonProperty("rootFolderPath")
    private String rootFolderPath;
    @JsonProperty("qualityProfileId")
    private int qualityProfileId;
    @JsonProperty("path")
    private String path;
    @JsonProperty("images")
    private List<ImageDTO> images;
    @JsonProperty("statistics")
    private StatisticsDTO statistics;
    @JsonProperty("ratings")
    private RatingsDTO ratings;
    @JsonProperty("tags")
    private List<Integer> tags;
    @JsonProperty("runtime")
    private int runTime;
    @JsonProperty("firstAired")
    private Instant firstEpisodeDate;
    @JsonProperty("previousAiring")
    private Instant lastEpisodeDate;
    @JsonProperty("seasons")
    private List<SeasonDTO> seasons;
    @JsonProperty("year")
    private int year;
    @JsonProperty("imdbId")
    private String imdbId;
    @JsonProperty("genres")
    private List<String> genres;
    @JsonProperty("added")
    private Instant added;

}
