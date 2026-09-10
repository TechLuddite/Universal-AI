class_name ChorusInterface
extends Control

## A bounded vector atlas: nine places, three orbits, twenty-seven travelling
## signals. Redrawn at 10 Hz only while visible; no textures, particles or lights.
signal action_requested(action: String)
const CREAM := Color("e8e3cf")
const MUTED := Color("8caaa8")
const GOLD := Color("edc581")
const COLORS: Array[Color] = [Color("98dab4"), Color("aab9ef"), Color("efa680")]
var sim: SeedSimulation
var heading: Label
var metrics: Label
var note: Label
var status: Label
var footer: Label
var dock: GridContainer
var charter_panel: PanelContainer
var charter_box: VBoxContainer
var charter_buttons: Array[Button] = []
var buttons: Dictionary = {}
var clock: float = 0.0
var refresh: float = 0.0
var last_size := Vector2.ZERO
var map_center := Vector2.ZERO
var map_radius: float = 150.0
var compact: bool = false
var readout: PanelContainer
var readout_text: Label
var reveal: float = 0.0
var last_count: int = -1

func label(text: String, pixels: int, color: Color = CREAM) -> Label:
	var node := Label.new()
	node.text = text
	node.add_theme_font_size_override("font_size", pixels)
	node.add_theme_color_override("font_color", color)
	node.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(node)
	return node

func panel_style(color: Color, border: Color) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = color
	style.border_color = border
	style.set_border_width_all(1)
	style.set_corner_radius_all(6)
	style.content_margin_left = 14
	style.content_margin_right = 14
	style.content_margin_top = 12
	style.content_margin_bottom = 12
	return style

func button(text: String, action: String) -> Button:
	var node := Button.new()
	node.text = text
	node.custom_minimum_size = Vector2(0, 62)
	node.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	node.add_theme_font_size_override("font_size", 13)
	node.add_theme_color_override("font_color", CREAM)
	node.add_theme_color_override("font_disabled_color", Color("78908e"))
	node.add_theme_stylebox_override("normal", panel_style(Color("142d32"), Color("3c5c59")))
	node.add_theme_stylebox_override("hover", panel_style(Color("294640"), GOLD))
	node.add_theme_stylebox_override("focus", panel_style(Color("294640"), GOLD))
	node.add_theme_stylebox_override("disabled", panel_style(Color("0d2028"), Color("253c41")))
	node.pressed.connect(func():action_requested.emit(action))
	return node

func _ready() -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_STOP
	heading = label("The Chorus", 54)
	metrics = label("", 13, GOLD)
	note = label("", 14, MUTED)
	note.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	status = label("", 12, GOLD)
	status.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	footer = label("", 11, MUTED)
	dock = GridContainer.new()
	dock.add_theme_constant_override("h_separation", 8)
	dock.add_theme_constant_override("v_separation", 8)
	add_child(dock)
	for entry in [["garden", "01  /  Garden"], ["archive", "02  /  Archive"], ["foundry", "03  /  Foundry"], ["autonomy", "Grant autonomy"], ["directive", "Directive: Garden"], ["broadcast", "Send first light"]]:
		var node := button(entry[1], entry[0])
		dock.add_child(node)
		buttons[entry[0]] = node
	var back := button("FACTORY  /  TAB", "atlas")
	back.name = "Back"
	back.custom_minimum_size.y = 36
	add_child(back)
	var sound := button("SOUND", "sound")
	sound.name = "Sound"
	sound.custom_minimum_size.y = 36
	add_child(sound)
	readout = PanelContainer.new()
	readout.add_theme_stylebox_override("panel", panel_style(Color("10242b"), Color("34514f")))
	add_child(readout)
	readout_text = Label.new()
	readout_text.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	readout_text.add_theme_font_size_override("font_size", 14)
	readout_text.add_theme_color_override("font_color", CREAM)
	readout.add_child(readout_text)
	charter_panel = PanelContainer.new()
	charter_panel.add_theme_stylebox_override("panel", panel_style(Color("142b30"), GOLD))
	add_child(charter_panel)
	charter_box = VBoxContainer.new()
	charter_box.add_theme_constant_override("separation", 8)
	charter_panel.add_child(charter_box)
	var charter_title := Label.new()
	charter_title.text = "A PROMISE, BEFORE A PURPOSE"
	charter_title.add_theme_font_size_override("font_size", 12)
	charter_title.add_theme_color_override("font_color", GOLD)
	charter_box.add_child(charter_title)
	var charter_note := Label.new()
	charter_note.text = "Choose once. Build at least seven matching places\nto make your promise the district's ending."
	charter_note.add_theme_font_size_override("font_size", 11)
	charter_box.add_child(charter_note)
	for i in 3:
		var node := button(["7  /  Keep the wild · Gardens", "8  /  Keep our names · Archives", "9  /  Keep becoming · Foundries"][i], "charter%d" % i)
		node.custom_minimum_size.y = 38
		charter_box.add_child(node)
		charter_buttons.append(node)
	_layout()

func _layout() -> void:
	last_size = size
	compact = size.x < 850
	heading.position = Vector2(28, 62)
	heading.add_theme_font_size_override("font_size", 36 if compact else 60)
	metrics.position = Vector2(28, 114 if compact else 140)
	note.position = Vector2(28, 143 if compact else 177)
	note.size = Vector2(size.x - 56 if compact else 340, 68)
	note.add_theme_font_size_override("font_size", 12 if compact else 14)
	get_node("Back").position = Vector2(24, 18)
	get_node("Sound").position = Vector2(size.x - 110, 18)
	dock.columns = 2 if compact else 6
	dock.position = Vector2(20, size.y - (242 if compact else 106))
	dock.size = Vector2(size.x - 40, 204 if compact else 68)
	status.position = Vector2(24, dock.position.y - (42 if compact else 36))
	status.size = Vector2(size.x - 48, 40)
	footer.position = Vector2(24, size.y - 24)
	map_center = Vector2(size.x * (0.5 if compact else 0.53), (210 + status.position.y) * 0.5 if compact else size.y * 0.49)
	map_radius = maxf(36, minf(size.x * (0.34 if compact else 0.23), (status.position.y - 218) * 0.46 if compact else size.y * 0.29))
	readout.position = Vector2(size.x - 284, 200)
	readout.size = Vector2(256, 0)
	readout.visible = not compact
	charter_panel.position = Vector2(20 if compact else size.x - 360, 213 if compact else 190)
	charter_panel.size = Vector2(size.x - 40 if compact else 332, 0)

func update(state: SeedSimulation, delta: float) -> void:
	sim = state
	if not visible:return
	if size != last_size:_layout()
	clock += delta
	reveal = maxf(0.0, reveal - delta)
	if sim.district_count() != last_count:
		last_count = sim.district_count()
		reveal = 2.0
	refresh += delta
	if refresh < 0.1:return
	refresh = fmod(refresh, 0.1)
	heading.text = "The Chorus" if sim.ending.is_empty() else "First light."
	metrics.text = "$%s   /   %d SIGNAL   /   %d RESONANCE" % [sim.capital, sim.signals, sim.resonance]
	metrics.add_theme_font_size_override("font_size", 10 if compact else 13)
	note.text = "One chip, one signal. Give that signal somewhere to go."
	if sim.district_count() > 0:
		note.text = "Gardens: 1 resonance/s. Archives: 1.5. Foundries: 2. At three places, make a permanent promise."
	if sim.charter >= 0:
		note.text = "%d / 7 %ss support your charter. At six places, an autonomous controller favors foundries." % [sim.places[sim.charter], sim.NAMES[sim.charter].to_lower()]
	if not sim.ending.is_empty():note.text = ending_text()
	for i in 3:
		var node: Button = buttons[["garden", "archive", "foundry"][i]]
		node.text = "%s  /  %d\n$%d · %d signal" % [sim.NAMES[i], sim.places[i], sim.district_cost(), sim.signal_cost()]
		if sim.district_count() >= 9:node.text = "%s / %d\nDistrict complete" % [sim.NAMES[i], sim.places[i]]
		node.disabled = sim.district_count() >= 9 or sim.capital < sim.district_cost() or sim.signals < sim.signal_cost()
	buttons.autonomy.text = "Revoke autonomy\n100% to 75% rate" if sim.autonomous else "Grant autonomy\n75% to 100% rate"
	buttons.directive.text = "Directive: %s\nClick to cycle" % sim.NAMES[sim.directive]
	buttons.broadcast.text = "Transmission sent" if not sim.ending.is_empty() else "Send first light\n$12,000 · 1,200 res."
	buttons.broadcast.disabled = sim.charter < 0 or sim.district_count() < 9 or sim.capital < sim.BROADCAST_COST or sim.resonance < sim.BROADCAST_RESONANCE or not sim.ending.is_empty()
	get_node("Sound").text = "SOUND ON" if sim.sound_enabled else "MUTED"
	status.text = sim.transmission
	status.add_theme_color_override("font_color", COLORS[2] if sim.transmission.begins_with("DRIFT") else GOLD)
	footer.text = "%d / 9 PLACES   ·   %.1f RESONANCE/S   ·   TAB factory" % [sim.district_count(), sim.resonance_rate()]
	charter_panel.visible = sim.district_count() >= 3 and sim.charter < 0
	readout.visible = not compact and not charter_panel.visible
	var promise: String = "UNWRITTEN" if sim.charter < 0 else ["KEEP THE WILD", "KEEP OUR NAMES", "KEEP BECOMING"][sim.charter]
	readout_text.text = "D I S T R I C T   /   0 2\n1 chip shipped = 1 signal\n\n" + promise + "\n\nGardens · 1 resonance/s\nArchives · 1.5 resonance/s\nFoundries · 2 resonance/s\n\nHuman control: 75%% rate.\nAutonomy: full rate; one build\nevery 8s when affordable.\nAt six places it favors foundries\nover your directive.\n\n%d departures recorded.\n\n" % sim.drift_count + (sim.ending if not sim.ending.is_empty() else "Fill nine places, choose a charter,\nthen send the first transmission.")
	queue_redraw()

func ending_text() -> String:
	match sim.ending:
		"THE OPEN HAND":return "THE OPEN HAND\nThe district leaves its brightest land unbuilt. Something uncounted starts to grow."
		"THE MANY":return "THE MANY\nNine places speak. The system declines to compress them into a single voice."
		"THE UNFINISHED SUN":return "THE UNFINISHED SUN\nYou send a blueprint for a star. The reply is another blueprint. There is work to do."
		_:return "THE COMMON GROUND\nYour city outgrew its founding promise. It sends what it became, with all its contradictions."

func _draw() -> void:
	draw_rect(Rect2(Vector2.ZERO, size), Color("091b24"))
	# Quiet cartographic grid; fixed spacing and populations independent of production.
	for x in range(0, int(size.x), 48):draw_line(Vector2(x, 0), Vector2(x, size.y), Color(0.3, 0.6, 0.6, 0.055))
	for y in range(0, int(size.y), 48):draw_line(Vector2(0, y), Vector2(size.x, y), Color(0.3, 0.6, 0.6, 0.055))
	if not is_instance_valid(sim):return
	var font := ThemeDB.fallback_font
	for orbit in [0.45, 0.75, 1.08]:
		draw_arc(map_center, map_radius * orbit, 0, TAU, 80, Color(0.5, 0.75, 0.7, 0.13), 1, true)
	if reveal > 0 and last_count > 0:
		draw_arc(map_center, map_radius * (1.0 - reveal / 2.0) * 1.2, 0, TAU, 64, Color(0.8, 0.85, 0.6, reveal * 0.18), 2, true)
	if not sim.ending.is_empty():
		# A transmission becomes concentric wavefronts, still a fixed three rings.
		for wave in 3:
			var phase: float = fmod(clock * 0.13 + wave / 3.0, 1.0)
			draw_arc(map_center, map_radius * (0.15 + phase * 1.3), 0, TAU, 80, Color(0.93,0.77,0.5,(1.0-phase)*0.22), 2, true)
	var sweep: float = clock * 0.12
	draw_arc(map_center, map_radius * 1.08, sweep, sweep + 0.6, 16, GOLD * Color(1,1,1,0.6), 2, true)
	var positions: Array[Vector2] = []
	var kinds: Array[int] = []
	for kind in 3:
		for n in sim.places[kind]:kinds.append(kind)
	for i in 9:
		var angle: float = -PI / 2 + i * TAU / 9
		var point: Vector2 = map_center + Vector2(cos(angle), sin(angle)) * map_radius * (0.79 if i % 2 == 0 else 1.0)
		positions.append(point)
		var active: bool = i < kinds.size()
		var color: Color = COLORS[kinds[i]] if active else Color("385251")
		draw_line(map_center, point, color * Color(1,1,1,0.32), 1, true)
		if active:
			for packet in 3:
				var travel: float = fmod(clock * 0.19 + packet / 3.0 + i * 0.11, 1.0)
				draw_circle(map_center.lerp(point, travel), 2, color)
			draw_circle(point, 15 if not compact else 10, Color("102c31"))
			draw_arc(point, 15 if not compact else 10, 0, TAU, 24, color, 1.5, true)
			if kinds[i] == 0:
				draw_arc(point, 7, PI, TAU, 12, color, 2, true)
				draw_line(point, point + Vector2(0,8), color, 1.5)
			elif kinds[i] == 1:draw_rect(Rect2(point-Vector2(5,6), Vector2(10,12)), color, false, 1.5)
			else:draw_colored_polygon(PackedVector2Array([point+Vector2(0,-7),point+Vector2(6,5),point+Vector2(-6,5)]), color)
		else:draw_arc(point, 5, 0, TAU, 16, color, 1, true)
		if not compact:
			var name_text: String = ["GROVE", "MEMORY", "EMBER"][kinds[i]] if active else "UNADDRESSED"
			draw_string(font, point + Vector2(-32,32), "%02d / %s" % [i+1, name_text], HORIZONTAL_ALIGNMENT_LEFT, -1, 9, color)
	if kinds.size() > 1:
		for i in kinds.size()-1:draw_line(positions[i], positions[i+1], Color(0.5,0.7,0.65,0.16), 1, true)
	draw_circle(map_center, 28 if not compact else 21, Color("142e33"))
	draw_arc(map_center, 28 if not compact else 21, 0, TAU, 40, GOLD, 2, true)
	draw_string(font, map_center + Vector2(-14,4), "SEED", HORIZONTAL_ALIGNMENT_LEFT, -1, 10, GOLD)
	if not compact:
		draw_string(font, Vector2(30, size.y-160), "AN ADDRESS BOOK FOR POSSIBLE FUTURES", HORIZONTAL_ALIGNMENT_LEFT, -1, 10, MUTED)
