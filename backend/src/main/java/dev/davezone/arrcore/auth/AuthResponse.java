package dev.davezone.arrcore.auth;

public class AuthResponse {
    private String jwt;

    public AuthResponse() {}

    public AuthResponse(String jwt) {
        this.jwt = jwt;
    }

    // Getter és Setter
    public String getJwt() { return jwt; }
    public void setJwt(String jwt) { this.jwt = jwt; }
}
