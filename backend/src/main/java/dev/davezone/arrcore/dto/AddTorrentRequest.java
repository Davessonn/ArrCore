package dev.davezone.arrcore.dto;

import lombok.Data;

@Data
public class AddTorrentRequest {
    private String urls;
    private String savePath;
    private String cookie;
    private String category;
    private String tags;
    private Boolean skipChecking;
    private Boolean paused;
    private Boolean rootFolder;
    private String rename;
    private Integer upLimit;
    private Integer dlLimit;
    private Double ratioLimit;
    private Integer seedingTimeLimit;
    private Boolean autoTmm;
    private Boolean sequentialDownload;
    private Boolean firstLastPiecePrio;
}

