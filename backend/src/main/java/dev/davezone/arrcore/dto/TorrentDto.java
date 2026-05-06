package dev.davezone.arrcore.dto;

import lombok.Data;

@Data
public class TorrentDto {
    private long added_on;
    private long amount_left;
    private boolean auto_tmm;
    private double availability;
    private String category;
    private long completed;
    private long completion_on;
    private String content_path;
    private long dl_limit;
    private long dlspeed;
    private long downloaded;
    private long downloaded_session;
    private long eta;
    private boolean f_l_piece_prio;
    private boolean force_start;
    private String hash;
    private boolean isPrivate;
    private long last_activity;
    private String magnet_uri;
    private double max_ratio;
    private long max_seeding_time;
    private String name;
    private long num_complete;
    private long num_incomplete;
    private long num_leechs;
    private long num_seeds;
    private long priority;
    private double progress;
    private double ratio;
    private double ratio_limit;
    private String save_path;
    private long seeding_time;
    private long seeding_time_limit;
    private long seen_complete;
    private boolean seq_dl;
    private long size;
    private String state;
    private boolean super_seeding;
    private String tags;
    private long time_active;
    private long total_size;
    private String tracker;
    private long up_limit;
    private long uploaded;
    private long uploaded_session;
    private long upspeed;
}
