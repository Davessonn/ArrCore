package dev.davezone.arrcore.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;

@Data
public class SonarrSeriesDto {
    @JsonProperty("id")
    private Long id;
    @JsonProperty("title")
    private String title;
    @JsonProperty("status")
    private String status;
    @JsonProperty("rootFolderPath")
    private String rootFolderPath;
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


}

