package dev.davezone.arrcore.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class RootFolderDto {

    @JsonProperty("id")
    private Long id;

    @JsonProperty("path")
    private String path;

    @JsonProperty("accessible")
    private Boolean accessible;

    @JsonProperty("freeSpace")
    private Long freeSpace;

    @JsonProperty("unmappedFolders")
    private List<Map<String, Object>> unmappedFolders;
}
