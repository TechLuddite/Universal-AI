shader_type canvas_item;
render_mode unshaded;
uniform sampler2D screen_texture : hint_screen_texture, repeat_disable, filter_linear_mipmap;
uniform float bloom = 0.24;
void fragment() {
	vec3 color = textureLod(screen_texture, SCREEN_UV, 0.0).rgb;
	vec3 blur = textureLod(screen_texture, SCREEN_UV, 3.3).rgb;
	vec3 wide = textureLod(screen_texture, SCREEN_UV, 5.0).rgb;
	color += max(blur - vec3(0.37), vec3(0.0)) * bloom;
	color += max(wide - vec3(0.27), vec3(0.0)) * bloom*0.5;
	vec2 p = SCREEN_UV - 0.5;
	float vignette = 1.0 - dot(p,p)*0.65;
	color *= vignette;
	COLOR = vec4(color,1.0);
}
