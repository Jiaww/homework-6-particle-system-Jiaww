#version 300 es
precision highp float;
uniform float u_Time;

in vec4 fs_Col;
in vec4 fs_Pos;

out vec4 out_Col;

void main()
{
    float dist = 1.0 - (length(fs_Pos.xyz) * 2.0);
    //out_Col = vec4(dist) * fs_Col;
    vec4 tintColor = vec4(1.0-sin(u_Time), 0.2, sin(u_Time)*cos(u_Time), 1.0);
    tintColor *= 0.5;
    tintColor += vec4(0.5);
    out_Col = vec4(dist) * fs_Col * tintColor;
}
