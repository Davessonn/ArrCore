package dev.davezone.arrcore.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class ImageDTO {

    @JsonProperty("coverType")
    private String coverType;
    @JsonProperty("url")
    private String url;
    @JsonProperty("remoteUrl")
    private String remoteUrl;
}
