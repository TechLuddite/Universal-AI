shader_type spatial;
render_mode cull_disabled;
uniform float activity = 0.0;
uniform vec4 cold_color : source_color = vec4(0.05,0.25,0.30,1.0);
void fragment() {
	vec2 grid = abs(fract(UV * 15.0) - 0.5);
	float lines = 1.0 - smoothstep(0.025, 0.05, min(grid.x, grid.y));
	float rainbow = sin(UV.x*14.0+UV.y*7.0+TIME*0.3)*0.5+0.5;
	vec3 surface = mix(cold_color.rgb, vec3(0.28,0.16,0.40), rainbow);
	float scan = exp(-pow((UV.y - fract(TIME*0.7))*30.0, 2.0))*activity;
	ALBEDO = surface + lines*vec3(0.05,0.25,0.25);
	METALLIC = 0.75;
	ROUGHNESS = 0.25;
	EMISSION = lines*vec3(0.01,0.08,0.10) + scan*vec3(0.25,0.95,0.72)*0.6;
}
