package dev.davezone.arrcore.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class SeasonDTO {
    @JsonProperty("seasonNumber")
    private int seasonNumber;

    @JsonProperty("monitored")
    private boolean monitored;

    @JsonProperty("statistics")
    private StatisticsDTO statistics;
}
