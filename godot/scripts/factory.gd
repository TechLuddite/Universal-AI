extends Node3D

const Simulation = preload("res://scripts/simulation.gd")
const Chamber = preload("res://scripts/chamber.gd")
const Machine = preload("res://scripts/machine.gd")
const Chorus = preload("res://scripts/chorus.gd")
const Interface = preload("res://scripts/interface.gd")
const SAVE_PATH: String = "user://the-seed-v1.json"
var sim: SeedSimulation
var room: FactoryChamber
var ui: FactoryInterface
var chorus: ChorusInterface
var atlas: bool = false
var manual: FabMachine
var machines: Array[FabMachine] = []
var prepared_machines: Array[FabMachine] = []
var last_window_size:=Vector2i.ZERO
var camera: Camera3D
var key_light: DirectionalLight3D
var yaw: float = 0.64
var pitch: float = 0.68
var zoom: float = 27.5
var target_zoom: float = 27.5
var time: float = 0.0
var save_timer: float = 0.0
var click_origin := Vector2.ZERO
var dragging: bool = false
var pointer_down: bool = false
var mouse_delta: float = 0.0
var saving: bool = true
var test_mode: bool = false
var inspecting: int = -1
var camera_focus: bool = false
var camera_target := Vector3(0,0.5,-0.3)
var sounds: Dictionary = {}
var sound_voices: Array[AudioStreamPlayer] = []
var sound_index: int = 0
var ambience: AudioStreamPlayer
var production_chime: float = 0.0
var selected_ring: MeshInstance3D
var debug_timer: float = 0.0
var fps_samples: int = 0
var reset_pending: bool = false

func _ready() -> void:
	Engine.max_fps=30
	_limit_render_size()
	get_window().size_changed.connect(_limit_render_size)
	sim=Simulation.new()
	if OS.has_feature("web"):
		test_mode=str(JavaScriptBridge.get_interface("window").location.search).contains("test=1")
	else:
		test_mode="--test" in OS.get_cmdline_user_args()
	saving=not test_mode
	if OS.has_feature("web") and str(JavaScriptBridge.get_interface("window").location.search).contains("persist=1"):
		saving=true
	if saving:_load_game()
	if test_mode and OS.has_feature("web") and str(JavaScriptBridge.get_interface("window").location.search).contains("scenario=chorus"):
		# Browser regression starts from a known old-format save; normal play has no setter.
		sim.restore({"version":1, "capital":60000, "wafers":300, "chips":1200, "fabs":6, "overclock":true, "controller":true, "linked":true, "sound_enabled":false})
	_create_environment()
	room=Chamber.new()
	add_child(room)
	room.construct()
	manual=Machine.new()
	manual.position=Vector3(0,0.18,-0.4)
	add_child(manual)
	manual.construct(-1,true)
	# Prepare geometry during loading, never inside a purchase or production event.
	for i in Simulation.MAX_FABS:
		var machine:=Machine.new()
		machine.position=Chamber.BAY_POSITIONS[i]+Vector3(0,0.2,0)
		add_child(machine)
		machine.construct(i)
		machine.visible=false
		prepared_machines.append(machine)
	for i in sim.fabs:_add_machine(i,false)
	camera_focus=sim.fabs==0
	_create_camera()
	_create_audio()
	ui=Interface.new()
	add_child(ui)
	ui.action_requested.connect(_action)
	var atlas_layer := CanvasLayer.new()
	atlas_layer.layer = 20
	add_child(atlas_layer)
	chorus = Chorus.new()
	atlas_layer.add_child(chorus)
	chorus.action_requested.connect(_action)
	chorus.visible = false
	selected_ring=FactoryGeometry.ring(self,Vector3(0,0.14,-0.4),1.65,0.014,FactoryGeometry.material(Color("f4cb80"),0,0.3,1))
	if sim.linked:_toggle_atlas()
	if sim.fabs>0:ui.notify("Run restored. Your machines were waiting for you.")
	print("THE SEED: ready — %d fabs, %d chips"%[sim.fabs,sim.chips])

func _create_environment() -> void:
	var world:=WorldEnvironment.new()
	var env:=Environment.new()
	env.background_mode=Environment.BG_COLOR
	env.background_color=Color("09131f")
	env.ambient_light_source=Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color=Color("9db9d0")
	env.ambient_light_energy=0.38
	env.tonemap_mode=Environment.TONE_MAPPER_FILMIC
	world.environment=env
	add_child(world)
	key_light=DirectionalLight3D.new()
	key_light.rotation_degrees=Vector3(-53,-32,0)
	key_light.light_color=Color("ffe4b4")
	key_light.light_energy=1.25
	key_light.shadow_enabled=true
	key_light.directional_shadow_max_distance=65
	key_light.shadow_bias=0.04
	add_child(key_light)
	var rim:=DirectionalLight3D.new()
	rim.rotation_degrees=Vector3(-25,140,0)
	rim.light_color=Color("77b3e6")
	rim.light_energy=0.65
	add_child(rim)
	var fill:=OmniLight3D.new()
	fill.position=Vector3(0,4,-4)
	fill.light_color=Color("80e8d9")
	fill.light_energy=1.3
	fill.omni_range=13
	add_child(fill)

func _create_camera() -> void:
	camera=Camera3D.new()
	camera.projection=Camera3D.PROJECTION_ORTHOGONAL
	camera.size=zoom
	camera.far=140
	camera.current=true
	add_child(camera)
	_camera_update(1)

func _limit_render_size() -> void:
	# Bound GPU work on high-DPI screens; preserve aspect and portrait controls.
	var window:=get_window()
	if window.size==last_window_size:return
	last_window_size=window.size
	var physical:=Vector2(window.size)
	var factor:=minf(1.0,minf(1440.0/maxf(1,physical.x),900.0/maxf(1,physical.y)))
	var target:=Vector2i((physical*factor).round())
	window.content_scale_mode=Window.CONTENT_SCALE_MODE_VIEWPORT
	if window.content_scale_size!=target:window.content_scale_size=target

func _create_audio() -> void:
	for id in ["etch","chip","build","supply","uplink"]:
		sounds[id]=load("res://assets/audio/"+id+".wav")
	for i in 8:
		var voice:=AudioStreamPlayer.new()
		voice.volume_db=-16
		add_child(voice)
		sound_voices.append(voice)
	ambience=AudioStreamPlayer.new()
	ambience.stream=load("res://assets/audio/room.wav")
	ambience.volume_db=-27
	add_child(ambience)

func _sound(id: String, volume: float=-15.0) -> void:
	if not sim.sound_enabled:return
	if not ambience.playing:ambience.play()
	var voice: AudioStreamPlayer=sound_voices[sound_index%sound_voices.size()]
	sound_index+=1
	voice.stream=sounds[id]
	voice.volume_db=volume
	voice.pitch_scale=1.0+float(sound_index%5)*0.015
	voice.play()

func _process(delta: float) -> void:
	_limit_render_size()
	# A short fixed step keeps production deterministic across render frame rates.
	# Browser tab suspension does not mint unobserved chips in this prototype.
	var remaining: float=minf(delta,0.25)
	while remaining>0.00001:
		var dt: float=minf(remaining,1.0/60.0)
		sim.step(dt)
		remaining-=dt
	if Input.is_physical_key_pressed(KEY_SPACE) and not ui.reset_confirm.visible:
		sim.etch()
	time+=delta
	production_chime=maxf(0,production_chime-delta)
	_handle_events()
	if not atlas:
		manual.animate(delta,sim.manual_progress,sim.overclock)
		for i in machines.size():machines[i].animate(delta,sim.cycles[i],sim.overclock)
		room.animate(delta,time,sim.fabs,sim.linked)
	if sim.linked:target_zoom=maxf(target_zoom,39.0)
	_camera_update(delta)
	ui.selected=inspecting
	if not atlas:ui.update(sim,delta,saving)
	chorus.update(sim,delta)
	selected_ring.position=(manual.position if inspecting<0 else machines[inspecting].position)+Vector3(0,0.02,0)
	selected_ring.rotation.y=time*0.08
	if ambience.playing:
		ambience.volume_db=lerpf(ambience.volume_db,-27+sim.fabs*0.7,minf(1,delta))
	save_timer+=delta
	if save_timer>2:
		save_timer=0
		if saving:_save_game()
	if test_mode and OS.has_feature("web"):
		debug_timer+=delta
		if debug_timer>0.25:
			debug_timer=0
			var snapshot:=sim.to_save()
			snapshot["machines_visible"]=machines.size()
			snapshot["fps"]=Engine.get_frames_per_second()
			snapshot["nodes"]=get_tree().get_node_count()
			snapshot["render_width"]=get_viewport().get_visible_rect().size.x
			snapshot["render_height"]=get_viewport().get_visible_rect().size.y
			snapshot["atlas"]=atlas
			snapshot["cinema"]=ui.focus_mode
			snapshot["camera_focus"]=camera_focus
			snapshot["draw_calls"]=Performance.get_monitor(Performance.RENDER_TOTAL_DRAW_CALLS_IN_FRAME)
			var browser_window=JavaScriptBridge.get_interface("window")
			browser_window.__seed=JavaScriptBridge.get_interface("JSON").parse(JSON.stringify(snapshot))

func _camera_update(delta: float) -> void:
	var size: Vector2=get_viewport().get_visible_rect().size
	zoom=lerpf(zoom,13.0 if camera_focus else target_zoom,minf(1.0,delta*2.0))
	camera.size=zoom if size.x>=1000 else zoom*1.12 if size.x>650 else zoom*1.2
	camera.h_offset=2.7 if size.x>=1000 and not ui_is_cinema() else 0.0
	camera.v_offset=-0.5 if size.x>=1000 else -1.2
	var target:=Vector3(0,0.5,-0.3)
	if camera_focus:
		target=(manual.position if inspecting<0 else machines[inspecting].position)+Vector3(0,1.0,0.4)
	camera_target=camera_target.lerp(target,minf(1.0,delta*2))
	camera.position=camera_target+Vector3(sin(yaw)*cos(pitch),sin(pitch),cos(yaw)*cos(pitch))*36
	camera.look_at(camera_target)

func ui_is_cinema() -> bool:
	return is_instance_valid(ui) and ui.focus_mode

func _add_machine(index: int, animate: bool=true) -> void:
	var machine: FabMachine=prepared_machines[index]
	machine.visible=true
	if animate:machine.birth=0
	machines.append(machine)

func _action(action: String) -> void:
	if ui.reset_confirm.visible and action!="reset":return
	match action:
		"atlas":
			if sim.linked:_toggle_atlas()
		"garden":sim.plant(0)
		"archive":sim.plant(1)
		"foundry":sim.plant(2)
		"charter0":sim.choose_charter(0)
		"charter1":sim.choose_charter(1)
		"charter2":sim.choose_charter(2)
		"autonomy":sim.toggle_autonomy()
		"directive":
			sim.directive = (sim.directive + 1) % 3
			sim.report("DIRECTIVE / Prefer %s. At six places an autonomous controller may depart." % sim.NAMES[sim.directive])
		"broadcast":sim.broadcast()
		"etch":sim.etch()
		"supply":
			if not sim.buy_wafers() and not sim.reclaim():ui.notify("A wafer shipment costs $600. Keep etching.")
		"fab":
			if not sim.build_fab():ui.notify("Earn $%d to commission the next machine."%sim.fab_cost())
		"upgrade":sim.upgrade()
		"controller":sim.toggle_controller()
		"uplink":
			if sim.linked:_toggle_atlas()
			else:sim.uplink()
		"sound":
			sim.sound_enabled=not sim.sound_enabled
			# Web sample playback restarts its source on every unpause assignment.
			# Only change this state in response to an actual sound toggle.
			if ambience.stream_paused==sim.sound_enabled:
				ambience.stream_paused=not sim.sound_enabled
			if sim.sound_enabled:_sound("chip")
		"view":ui.toggle_view()
		"inspect":camera_focus=not camera_focus
		"reset":
			sim=Simulation.new()
			if saving:_save_game()
			get_tree().reload_current_scene()

func _handle_events() -> void:
	for event in sim.take_events():
		match event.type:
			"start":
				if int(event.machine)==-1:_sound("etch",-18)
			"chip":
				var index: int=int(event.machine)
				if index<0:manual.eject()
				elif index<machines.size():machines[index].eject()
				if production_chime<=0:
					_sound("chip",-23 if index>=0 else -16)
					production_chime=0.18
				if sim.chips==1:ui.notify("First chip shipped. $100. A very small beginning.",true)
				elif sim.chips==12 and sim.fabs==0:ui.notify("Your first fab is ready to fund. Press B or choose Install a fab.",true)
			"build":
				_add_machine(int(event.machine))
				camera_focus=false
				_sound("build",-12)
				inspecting=int(event.machine)
				if sim.fabs==1:ui.notify("The first machine is working without you.",true)
				elif sim.fabs==3:ui.notify("Three fabs online. The supply controller is now available.",true)
				elif sim.fabs==6:ui.notify("All six bays are alive. The district uplink is ready.",true)
				else:ui.notify("Bay %02d connected. The room grows louder."%sim.fabs)
			"supply":
				_sound("supply",-20)
				ui.notify("30 silicon wafers delivered. $600 debited.")
			"reclaim":
				ui.notify("Emergency scrap recovered: 3 usable wafers. You can rebuild.",true)
			"upgrade":
				_sound("build",-14)
				ui.notify("Overclock online. Fabrication cycle: 3.2s → 1.8s.",true)
			"controller":ui.notify("Supply controller enabled. It buys wafers below the reserve threshold." if sim.controller else "Supply controller paused. Procurement is yours again.",true)
			"chorus":ui.notify(str(event.message), true)
			"uplink":
				if not atlas:_toggle_atlas()
				_sound("uplink",-10)
				ui.notify("UPLINK ESTABLISHED. You are no longer the only factory.",true)

func _input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo and not ui.reset_confirm.visible:
		match event.physical_keycode:
			KEY_TAB:_action("atlas")
			KEY_1:
				if atlas:_action("garden")
			KEY_2:
				if atlas:_action("archive")
			KEY_3:
				if atlas:_action("foundry")
			KEY_7:
				if atlas:_action("charter0")
			KEY_8:
				if atlas:_action("charter1")
			KEY_9:
				if atlas:_action("charter2")
			KEY_D:
				if atlas:_action("directive")
			KEY_ENTER:
				if atlas:_action("broadcast")
			KEY_SPACE:_action("etch")
			KEY_B:_action("fab")
			KEY_R:_action("supply")
			KEY_O:_action("upgrade")
			KEY_A:_action("autonomy" if atlas else "controller")
			KEY_U:_action("uplink")
			KEY_M:_action("sound")
			KEY_F:_action("view")
			KEY_C:_action("inspect")
			KEY_ESCAPE:
				if ui.focus_mode:ui.toggle_view()
			KEY_Q:yaw-=0.12
			KEY_E:yaw+=0.12
			KEY_HOME:
				camera_focus=false
				yaw=0.64
				pitch=0.68
				target_zoom=27.5
			_:return
		get_viewport().set_input_as_handled()

func _unhandled_input(event: InputEvent) -> void:
	if atlas:return
	if event is InputEventMouseButton:
		if event.button_index in [MOUSE_BUTTON_WHEEL_UP,MOUSE_BUTTON_WHEEL_DOWN] and event.pressed:
			if camera_focus:target_zoom=zoom
			camera_focus=false
			target_zoom=clampf(target_zoom+(-1.2 if event.button_index==MOUSE_BUTTON_WHEEL_UP else 1.2),10,46)
		elif event.button_index in [MOUSE_BUTTON_LEFT,MOUSE_BUTTON_RIGHT]:
			if event.pressed:
				pointer_down=true
				dragging=event.button_index==MOUSE_BUTTON_RIGHT
				click_origin=event.position
				mouse_delta=0
			else:
				if pointer_down and not dragging and mouse_delta<6:_pick(event.position)
				pointer_down=false
				dragging=false
	elif event is InputEventMouseMotion and pointer_down:
		mouse_delta+=event.relative.length()
		if mouse_delta>6:dragging=true
		if dragging:
			yaw-=event.relative.x*0.006
			pitch=clampf(pitch+event.relative.y*0.004,0.35,1.2)
	elif event is InputEventMagnifyGesture:target_zoom=clampf(target_zoom/event.factor,16,46)
	elif event is InputEventScreenDrag:
		yaw-=event.relative.x*0.006
		pitch=clampf(pitch+event.relative.y*0.004,0.35,1.2)

func _pick(screen_pos: Vector2) -> void:
	var origin:=camera.project_ray_origin(screen_pos)
	var direction:=camera.project_ray_normal(screen_pos)
	var best: float=INF
	var hit_id: int=-99
	var targets: Array[FabMachine]=[manual]
	targets.append_array(machines)
	for machine in targets:
		var bounds:=AABB(machine.position+Vector3(-1.5,0,-1.1),Vector3(3,3.2,3.8))
		var hit: Variant=bounds.intersects_ray(origin,direction)
		if hit is Vector3:
			var distance: float=origin.distance_to(hit)
			if distance<best:
				best=distance
				hit_id=machine.machine_id
	if hit_id!=-99:
		inspecting=hit_id
		if hit_id==-1:_action("etch")
		else:ui.notify("Fab %02d · %s · %.1fs per chip"%[hit_id+1,"ETCHING" if sim.cycles[hit_id]>=0 else "WAITING FOR SILICON",sim.cycle_seconds()])
		return
	var ground: Variant=Plane(Vector3.UP,0.15).intersects_ray(origin,direction)
	if ground is Vector3:
		for i in range(sim.fabs,6):
			if (ground-Chamber.BAY_POSITIONS[i]).length()<2:
				if i==sim.fabs:_action("fab")
				else:ui.notify("Connect bay %02d first. The line expands in sequence."%(sim.fabs+1))
				return

func _toggle_atlas() -> void:
	atlas = not atlas
	chorus.visible = atlas
	ui.root.visible = not atlas
	room.visible = not atlas
	manual.visible = not atlas
	selected_ring.visible = not atlas
	for machine in machines:machine.visible = not atlas
	camera_focus = false

func _save_game() -> void:
	var file:=FileAccess.open(SAVE_PATH,FileAccess.WRITE)
	if file==null:
		saving=false
		ui.notify("Local storage unavailable. This run will last for this session.")
		return
	file.store_string(JSON.stringify(sim.to_save()))
	file.close()

func _load_game() -> void:
	if not FileAccess.file_exists(SAVE_PATH):return
	var file:=FileAccess.open(SAVE_PATH,FileAccess.READ)
	if file==null:return
	var data: Variant=JSON.parse_string(file.get_as_text())
	if data is Dictionary:sim.restore(data)

func _notification(what: int) -> void:
	if what==NOTIFICATION_APPLICATION_FOCUS_OUT and is_instance_valid(sim) and saving:
		_save_game()
