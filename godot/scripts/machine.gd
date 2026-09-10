class_name FabMachine
extends Node3D

const Geo = preload("res://scripts/geometry.gd")
var machine_id: int = -1
var is_manual: bool = false
var head: Node3D
var laser: MeshInstance3D
var wafer: MeshInstance3D
var wafer_mat: ShaderMaterial
var rotor: Node3D
var display: Label3D
var status_light: MeshInstance3D
var arm: Node3D
var progress: float = -1.0
var clock: float = 0.0
var birth: float = 1.0
var overclocked: bool = false
var chip_objects: Array[Dictionary] = []
var sparks: Array[Dictionary] = []
var spark_pool: Array[MeshInstance3D] = []
var chip_pool: Array[Node3D] = []
var spark_timer: float = 0.0
var shell_mat: StandardMaterial3D
var dark_mat: StandardMaterial3D
var light_mat: StandardMaterial3D
var teal_mat: StandardMaterial3D
var copper_mat: StandardMaterial3D
var beam_mat: StandardMaterial3D

func construct(id: int, manual: bool = false) -> void:
	machine_id = id
	is_manual = manual
	shell_mat = Geo.material(Color("889ca6"), 0.45, 0.35)
	dark_mat = Geo.material(Color("162b38"), 0.65, 0.38)
	light_mat = Geo.material(Color("f8cb75"), 0.1, 0.3, 1.4)
	teal_mat = Geo.material(Color("6ee3d4"), 0.25, 0.3, 1.1)
	copper_mat = Geo.material(Color("b58356"), 0.7, 0.33)
	beam_mat = Geo.material(Color("73ffe4"), 0.0, 0.1, 3.0)
	var base_color := Geo.material(Color("334c59"), 0.6, 0.45)
	# Plinth, feet, chassis, removable face panels, and service vents.
	Geo.box(self, Vector3(0,0.15,0), Vector3(2.7,0.3,2.6), dark_mat)
	Geo.box(self, Vector3(0,0.65,0), Vector3(2.35,0.8,2.15), base_color)
	Geo.box(self, Vector3(0,1.08,0), Vector3(2.65,0.12,2.45), shell_mat)
	for x in [-1.0, 1.0]:
		for z in [-0.9, 0.9]:
			Geo.cylinder(self, Vector3(x,0.08,z), 0.15, 0.25, copper_mat)
	Geo.box(self, Vector3(0,0.65,1.09), Vector3(1.9,0.5,0.06), dark_mat)
	for x in range(7):
		Geo.box(self, Vector3(-0.76+x*0.24,0.66,1.13), Vector3(0.035,0.31,0.03), shell_mat)
	Geo.box(self, Vector3(0,0.99,1.13), Vector3(2.2,0.045,0.04), teal_mat)
	# Precision turntable with a real iridescent wafer shader.
	Geo.cylinder(self, Vector3(0,1.20,0.05), 0.95, 0.13, dark_mat)
	rotor = Node3D.new()
	rotor.position = Vector3(0,1.28,0.05)
	add_child(rotor)
	Geo.ring(rotor, Vector3.ZERO, 0.82, 0.027, copper_mat)
	wafer_mat = ShaderMaterial.new()
	wafer_mat.shader = preload("res://shaders/wafer.gdshader")
	wafer = Geo.cylinder(rotor, Vector3(0,0.02,0), 0.76, 0.025, wafer_mat)
	# An overhead gantry with an independently moving head and Z carriage.
	for x in [-1.07,1.07]:
		Geo.box(self, Vector3(x,1.9,-0.81), Vector3(0.19,1.65,0.24), shell_mat)
		Geo.box(self, Vector3(x,1.93,-0.65), Vector3(0.06,1.38,0.05), copper_mat)
	Geo.box(self, Vector3(0,2.72,-0.81), Vector3(2.55,0.27,0.34), shell_mat)
	Geo.box(self, Vector3(0,2.56,-0.64), Vector3(2.19,0.07,0.09), light_mat)
	head = Node3D.new()
	head.position = Vector3(0,2.25,0)
	add_child(head)
	Geo.box(head, Vector3(0,0.15,-0.42), Vector3(0.42,0.26,1.18), dark_mat)
	Geo.cylinder(head, Vector3.ZERO, 0.2, 0.35, shell_mat)
	Geo.cylinder(head, Vector3(0,-0.24,0), 0.12, 0.18, copper_mat, 0.18)
	Geo.ring(head, Vector3(0,-0.22,0), 0.15, 0.025, light_mat)
	laser = Geo.cylinder(head, Vector3(0,-0.61,0), 0.013, 0.75, beam_mat)
	laser.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	laser.visible = false
	# Side monitor and status lamp, arranged to remain legible in the cutaway.
	Geo.box(self, Vector3(1.12,1.44,0.78), Vector3(0.54,0.5,0.18), dark_mat)
	Geo.box(self, Vector3(1.12,1.45,0.88), Vector3(0.45,0.35,0.02), Geo.material(Color("123f46"),0.0,0.4,0.45))
	display = Geo.label(self, "READY", Vector3(1.12,1.45,0.901), 15, Color("a3f4d5"))
	display.pixel_size = 0.0033
	status_light = Geo.sphere(self, Vector3(1.07,2.94,-0.81), 0.075, teal_mat)
	Geo.cylinder(self, Vector3(1.07,2.83,-0.81), 0.035, 0.19, dark_mat)
	# A robotic loading arm; its shoulder and gripper sweep during the cycle.
	arm = Node3D.new()
	arm.position = Vector3(-1.02,1.18,0.7)
	add_child(arm)
	Geo.cylinder(arm, Vector3.ZERO, 0.16, 0.12, copper_mat)
	Geo.pipe(arm, Vector3(0,0.05,0), Vector3(0,0.55,0), 0.07, shell_mat)
	Geo.pipe(arm, Vector3(0,0.55,0), Vector3(0.58,0.55,0), 0.055, shell_mat)
	Geo.sphere(arm, Vector3(0,0.55,0),0.11,dark_mat)
	Geo.box(arm, Vector3(0.58,0.46,0), Vector3(0.17,0.2,0.25), copper_mat)
	# The output belt physically carries every visible completed chip.
	Geo.box(self, Vector3(0,0.63,1.92), Vector3(0.88,0.16,1.6), dark_mat)
	for x in [-0.48,0.48]:
		Geo.box(self, Vector3(x,0.72,1.92), Vector3(0.07,0.12,1.7), shell_mat)
	for n in range(7):
		var roller := Geo.cylinder(self,Vector3(0,0.73,1.3+n*0.19),0.042,0.79,copper_mat)
		roller.rotation.z = PI/2.0
	var badge := Geo.label(self,"MANUAL / 00" if manual else "AUTO / %02d" % (id+1),Vector3(-0.05,0.34,1.17),22,Color("c3d4da"))
	badge.pixel_size=0.004
	Geo.batch(self,[head,rotor,arm,status_light])
	Geo.batch(head,[laser])
	Geo.batch(arm)
	for i in 6:
		var particle:=Geo.sphere(self,Vector3.ZERO,0.018,beam_mat)
		particle.cast_shadow=GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		particle.visible=false
		spark_pool.append(particle)
	for i in 2:
		var chip:=_create_chip()
		chip.visible=false
		chip_pool.append(chip)

func animate(delta: float, phase: float, hot: bool) -> void:
	clock += delta
	spark_timer=maxf(0,spark_timer-delta)
	progress = phase
	overclocked = hot
	if birth < 1.0:
		birth = minf(1.0, birth + delta * 0.8)
		var b: float = ease(birth, 0.35)
		scale = Vector3(1, maxf(0.01,b), 1)
	var active: bool = progress >= 0.0
	laser.visible = active and progress > 0.15 and progress < 0.84
	wafer_mat.set_shader_parameter("activity", 1.0 if laser.visible else 0.0)
	if active:
		var scan: float = clampf((progress-0.15)/0.7,0.0,1.0)
		head.position.x = sin(scan*PI*8.0)*0.58
		head.position.z = lerpf(-0.42,0.48,scan)
		head.position.y = 2.18 + sin(progress*PI)*0.07
		rotor.rotation.y += delta * 0.12
		arm.rotation.y = sin(progress*TAU)*0.55-0.3
		display.text = "ETCH"
		if laser.visible and spark_timer<=0:
			spark_timer=0.08
			_spark()
	else:
		head.position = head.position.lerp(Vector3(0,2.4,-0.3),minf(1.0,delta*5))
		arm.rotation.y = lerpf(arm.rotation.y,-0.7,minf(1.0,delta*3))
		display.text = "READY" if is_manual else "IDLE"
	status_light.scale = Vector3.ONE * (1.0+sin(clock*5)*0.08 if active else 0.8)
	for index in range(chip_objects.size()-1,-1,-1):
		var item: Dictionary = chip_objects[index]
		item.age += delta
		var mesh: Node3D = item.node
		mesh.position.z = 1.08+float(item.age)*1.3
		mesh.position.y = 0.86+sin(minf(float(item.age)*3,PI))*0.1
		if float(item.age)>1.25:
			mesh.visible=false
			chip_pool.append(mesh)
			chip_objects.remove_at(index)
	for index in range(sparks.size()-1,-1,-1):
		var item: Dictionary = sparks[index]
		item.age += delta
		item.velocity += Vector3.DOWN*delta*3
		item.node.position += item.velocity*delta
		item.node.scale = Vector3.ONE * maxf(0.0,1.0-float(item.age)*2.5)
		if item.age > 0.4:
			item.node.visible=false
			spark_pool.append(item.node)
			sparks.remove_at(index)

func _create_chip() -> Node3D:
	var chip := Node3D.new()
	add_child(chip)
	chip.position = Vector3(0,0.9,1.1)
	Geo.box(chip, Vector3.ZERO, Vector3(0.3,0.055,0.3), dark_mat)
	Geo.box(chip, Vector3(0,0.035,0), Vector3(0.21,0.013,0.21), light_mat)
	for side in [-1,1]:
		Geo.box(chip,Vector3(side*0.17,0,0),Vector3(0.03,0.035,0.26),copper_mat)
	Geo.batch(chip)
	return chip

func eject() -> void:
	if chip_pool.is_empty():return
	var chip: Node3D=chip_pool.pop_back()
	chip.position=Vector3(0,0.9,1.1)
	chip.visible=true
	chip_objects.append({"node":chip,"age":0.0})

func _spark() -> void:
	if spark_pool.is_empty():
		return
	var particle: MeshInstance3D=spark_pool.pop_back()
	particle.position=Vector3(head.position.x,1.35,head.position.z)
	particle.scale=Vector3.ONE
	particle.visible=true
	var angle: float = clock*53.0
	sparks.append({"node":particle,"age":0.0,"velocity":Vector3(cos(angle)*0.7,0.4,sin(angle)*0.7)})
