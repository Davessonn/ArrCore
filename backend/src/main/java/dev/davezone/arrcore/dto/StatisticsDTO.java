package dev.davezone.arrcore.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;

@Data
public class StatisticsDTO {

    @JsonProperty("seasonCount")
    private int seasonCount;
    @JsonProperty("episodeFileCount")
    private int episodeFileCount;
    @JsonProperty("episodeCount")
    private int episodeCount;
    @JsonProperty("totalEpisodeCount")
    private int totalEpisodeCount;
    @JsonProperty("sizeOnDisk")
    private long sizeOnDisk;
    @JsonProperty("releaseGroups")
    private List<String> releaseGroups;
    @JsonProperty("percentOfEpisodes")
    private double percentOfEpisodes;
}
