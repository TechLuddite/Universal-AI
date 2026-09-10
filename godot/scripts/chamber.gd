class_name FactoryChamber
extends Node3D

const Geo = preload("res://scripts/geometry.gd")
const BAY_POSITIONS: Array[Vector3] = [Vector3(-4.4,0,-4.5),Vector3(4.4,0,-4.5),Vector3(-4.4,0,0),Vector3(4.4,0,0),Vector3(-4.4,0,4.5),Vector3(4.4,0,4.5)]
var pads: Array[Node3D] = []
var pad_labels: Array[Label3D] = []
var strip_nodes: Array[MeshInstance3D] = []
var fans: Array[Node3D] = []
var district: Node3D
var beacon: MeshInstance3D
var district_progress: float = 0.0
var signal_material: StandardMaterial3D
var muted_material: StandardMaterial3D

func construct() -> void:
	var floor_mat := Geo.material(Color("263a48"),0.28,0.8)
	var concrete := Geo.material(Color("4c6570"),0.1,0.85)
	var dark := Geo.material(Color("101f2b"),0.4,0.5)
	var trim := Geo.material(Color("81969d"),0.65,0.4)
	var yellow := Geo.material(Color("e0aa4d"),0.25,0.6)
	var gold := Geo.material(Color("f6cb7c"),0.1,0.3,1.5)
	var cyan := Geo.material(Color("7ae5e1"),0.2,0.4,1.4)
	signal_material = cyan
	muted_material = Geo.material(Color("2d5360"),0.1,0.7,0.15)
	# Floating architectural slab. The game grows out of a physical foundation.
	Geo.box(self,Vector3(0,-0.68,0),Vector3(19.5,1.25,19.7),dark)
	Geo.box(self,Vector3(0,-0.07,0),Vector3(19.8,0.15,20),trim)
	# One MultiMesh for all floor tiles rather than hundreds of separate draws.
	var tile := BoxMesh.new()
	tile.size=Vector3(1.56,0.09,1.56)
	var batch := MultiMesh.new()
	batch.transform_format=MultiMesh.TRANSFORM_3D
	batch.mesh=tile
	batch.instance_count=144
	for x in range(12):
		for z in range(12):
			batch.set_instance_transform(x*12+z,Transform3D(Basis.IDENTITY,Vector3((x-5.5)*1.6,0.025,(z-5.5)*1.6)))
	var floor_mesh := MultiMeshInstance3D.new()
	floor_mesh.multimesh=batch
	floor_mesh.material_override=floor_mat
	add_child(floor_mesh)
	# Central aisle and recessed data channels.
	for x in [-1.85,1.85]:
		Geo.box(self,Vector3(x,0.08,0),Vector3(0.08,0.025,18.8),yellow)
		strip_nodes.append(Geo.box(self,Vector3(x+0.13,0.09,0),Vector3(0.035,0.025,18.8),muted_material))
	for z in [-7.1,2.35,7.1]:
		Geo.box(self,Vector3(0,0.075,z),Vector3(17.5,0.025,0.065),yellow)
	# Machine foundations and corner brackets are real build locations.
	for i in range(6):
		var pad := Node3D.new()
		pad.position=BAY_POSITIONS[i]
		add_child(pad)
		Geo.box(pad,Vector3(0,0.10,0.5),Vector3(3.5,0.12,3.7),dark)
		for x in [-1.6,1.6]:
			for z in [-1.1,2.1]:
				Geo.box(pad,Vector3(x,0.18,z),Vector3(0.07,0.04,0.38),yellow)
				Geo.box(pad,Vector3(x-signf(x)*0.16,0.18,z-signf(z)*0.16),Vector3(0.38,0.04,0.07),yellow)
		var text := Geo.label(pad,"BAY %02d"%(i+1),Vector3(0,0.2,0.2),48,Color("4b7581"))
		text.rotation.x=-PI/2
		pads.append(pad)
		pad_labels.append(text)
	# Back wall, high service doors, illuminated windows and exposed structure.
	Geo.box(self,Vector3(0,1.8,-9.6),Vector3(19.5,3.6,0.3),concrete)
	Geo.box(self,Vector3(0,0.65,-9.36),Vector3(19.5,1.1,0.15),dark)
	for x in [-9.3,-6.2,-3.1,3.1,6.2,9.3]:
		Geo.box(self,Vector3(x,2.45,-9.25),Vector3(0.22,4.9,0.4),trim)
	Geo.box(self,Vector3(0,4.85,-9.25),Vector3(19.3,0.24,0.45),dark)
	for x in [-7.75,-4.65,4.65,7.75]:
		Geo.box(self,Vector3(x,2.55,-9.4),Vector3(2.7,1.36,0.12),dark)
		Geo.box(self,Vector3(x,2.55,-9.30),Vector3(2.45,1.08,0.035),Geo.material(Color("183a49"),0.3,0.3,0.4))
		for n in [-0.75,0,0.75]:
			Geo.box(self,Vector3(x+n,2.55,-9.25),Vector3(0.04,1.12,0.03),trim)
		Geo.box(self,Vector3(x,3.85,-9.08),Vector3(2.2,0.065,0.06),gold)
	# Shipping gate and a large environmental title.
	Geo.box(self,Vector3(0,1.8,-9.28),Vector3(4.3,3.5,0.12),dark)
	for y in range(11):
		Geo.box(self,Vector3(0,0.3+y*0.27,-9.14),Vector3(3.65,0.22,0.12),floor_mat)
	for x in [-2.04,2.04]:
		Geo.box(self,Vector3(x,1.75,-9.02),Vector3(0.07,3.3,0.07),cyan)
	Geo.label(self,"UNIVERSAL / 01",Vector3(0,4.15,-9.0),88,Color("dfc695"))
	Geo.label(self,"PRECISION LITHOGRAPHY     •     SECTOR ZERO",Vector3(0,3.62,-9.0),25,Color("819d9f"))
	# Cutaway side wall and safety railing.
	for x in [-9.6,9.6]:
		Geo.box(self,Vector3(x,0.37,0),Vector3(0.22,0.7,19.2),concrete)
		for z in [-7.2,-2.4,2.4,7.2]:
			Geo.box(self,Vector3(x,0.85,z),Vector3(0.07,1.1,0.07),yellow)
		Geo.box(self,Vector3(x,1.3,0),Vector3(0.065,0.065,19.0),yellow)
	# Overhead utility pipe with couplings, connecting the whole plant.
	for y in [3.15,3.48]:
		Geo.pipe(self,Vector3(-8.85,y,-8.9),Vector3(8.85,y,-8.9),0.09,yellow if y>3.2 else trim)
		for x in [-8,-4,0,4,8]:
			Geo.cylinder(self,Vector3(x,y,-8.9),0.13,0.13,dark).rotation.z=PI/2
	for x in [-8.5,8.5]:
		Geo.pipe(self,Vector3(x,0.2,-8.6),Vector3(x,3.2,-8.6),0.11,trim)
		# Pressure vessels and rotating ventilation fans.
		Geo.cylinder(self,Vector3(x,0.9,-7.0),0.48,1.7,dark)
		Geo.cylinder(self,Vector3(x,1.8,-7.0),0.49,0.18,trim,0.32)
		Geo.ring(self,Vector3(x,0.45,-7.0),0.49,0.035,gold)
		Geo.ring(self,Vector3(x,1.45,-7.0),0.49,0.035,trim)
		var fan := Node3D.new()
		fan.position=Vector3(x,4.15,-9.0)
		fan.rotation.x=PI/2
		add_child(fan)
		Geo.ring(fan,Vector3.ZERO,0.38,0.04,dark)
		for blade in range(4):
			var mesh := Geo.box(fan,Vector3.ZERO,Vector3(0.65,0.05,0.14),trim)
			mesh.rotation.y=blade*PI/4
		fans.append(fan)
	# Input stock racks and crates along the front service lane.
	for x in [-7.6,7.6]:
		for level in range(3):
			Geo.box(self,Vector3(x,0.3+level*0.36,8.2),Vector3(1.45,0.3,0.8),floor_mat)
			Geo.box(self,Vector3(x,0.3+level*0.36,8.62),Vector3(0.8,0.13,0.015),yellow)
	Geo.label(self,"S I L I C O N    I N",Vector3(-6.2,0.09,7.55),35,Color("8aadaf")).rotation.x=-PI/2
	Geo.label(self,"I N T E L L I G E N C E    O U T",Vector3(3.7,0.09,8.5),29,Color("e1b974")).rotation.x=-PI/2
	_create_district()
	var moving: Array=[district]
	moving.append_array(fans)
	moving.append_array(strip_nodes)
	Geo.batch(self,moving)
	Geo.batch(district,[beacon])
	for fan in fans:Geo.batch(fan)

func _create_district() -> void:
	district=Node3D.new()
	add_child(district)
	var dark := Geo.material(Color("182b3a"),0.4,0.65)
	var lit := Geo.material(Color("7fcfc7"),0.3,0.3,0.8)
	for side in [-1,1]:
		for i in range(4):
			var x: float = side*(14.5+(i%2)*5.7)
			var z: float = -8.0-(i/2)*7.0
			var height: float = 3.0+i*1.6
			Geo.box(district,Vector3(x,height/2-0.6,z),Vector3(4.7,height,5.4),dark)
			for row in range(4):
				Geo.box(district,Vector3(x,0.4+row*0.6,z+2.72),Vector3(3.7,0.045,0.03),lit)
			Geo.box(district,Vector3(x,height-0.5,z),Vector3(3.4,0.13,3.6),dark)
			Geo.pipe(district,Vector3(x,0.15,z+3),Vector3(side*9.8,0.15,6),0.035,lit)
	var beacon_mat := Geo.material(Color("77e8e3"),0,0.2,2.0)
	beacon=Geo.cylinder(district,Vector3(0,5.0,-13),0.12,10,beacon_mat)
	Geo.cylinder(district,Vector3(0,0,-13),1.4,0.5,dark)
	Geo.ring(district,Vector3(0,0.35,-13),1.3,0.065,lit)
	district.visible=false

func animate(delta: float, time: float, count: int, linked: bool) -> void:
	for i in range(6):
		pad_labels[i].visible=i>=count
		pad_labels[i].modulate=Color("f4cb82") if i==count else Color("4b7581")
	for fan in fans:
		fan.rotate_y(delta*(1.5+count*0.2))
	for strip in strip_nodes:
		strip.material_override=signal_material if count>0 else muted_material
	if linked:
		district.visible=true
		district_progress=minf(1.0,district_progress+delta*0.24)
		district.position.y=lerpf(-8.0,0.0,ease(district_progress,0.3))
		beacon.scale.x=1.0+sin(time*2)*0.2
		beacon.scale.z=beacon.scale.x
