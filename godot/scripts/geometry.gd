class_name FactoryGeometry
extends RefCounted

static func material(color: Color, metal: float = 0.0, rough: float = 0.6, emission: float = 0.0) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = color
	m.metallic = metal
	m.roughness = rough
	if emission > 0:
		m.emission_enabled = true
		m.emission = color
		m.emission_energy_multiplier = emission
	return m

static func box(parent: Node3D, pos: Vector3, size: Vector3, mat: Material) -> MeshInstance3D:
	var mesh := BoxMesh.new()
	mesh.size = size
	return instance(parent, mesh, pos, mat)

static func cylinder(parent: Node3D, pos: Vector3, radius: float, height: float, mat: Material, top: float = -1.0) -> MeshInstance3D:
	var mesh := CylinderMesh.new()
	mesh.top_radius = radius if top < 0 else top
	mesh.bottom_radius = radius
	mesh.height = height
	mesh.radial_segments = 32
	return instance(parent, mesh, pos, mat)

static func sphere(parent: Node3D, pos: Vector3, radius: float, mat: Material) -> MeshInstance3D:
	var mesh := SphereMesh.new()
	mesh.radius = radius
	mesh.height = radius * 2.0
	mesh.radial_segments = 12
	mesh.rings = 6
	return instance(parent, mesh, pos, mat)

static func ring(parent: Node3D, pos: Vector3, radius: float, thickness: float, mat: Material) -> MeshInstance3D:
	var mesh := TorusMesh.new()
	mesh.inner_radius = radius - thickness
	mesh.outer_radius = radius + thickness
	mesh.rings = 40
	mesh.ring_segments = 8
	return instance(parent, mesh, pos, mat)

static func instance(parent: Node3D, mesh: Mesh, pos: Vector3, mat: Material) -> MeshInstance3D:
	var node := MeshInstance3D.new()
	node.mesh = mesh
	node.material_override = mat
	node.position = pos
	parent.add_child(node)
	return node

static func pipe(parent: Node3D, from: Vector3, to: Vector3, radius: float, mat: Material) -> MeshInstance3D:
	var node := cylinder(parent, (from + to) * 0.5, radius, from.distance_to(to), mat)
	node.quaternion = Quaternion(Vector3.UP, (to - from).normalized())
	return node

static func label(parent: Node3D, content: String, pos: Vector3, size: int = 40, color: Color = Color.WHITE) -> Label3D:
	var text := Label3D.new()
	text.text = content
	text.font_size = size
	text.pixel_size = 0.006
	text.modulate = color
	text.outline_size = 0
	text.no_depth_test = false
	text.position = pos
	parent.add_child(text)
	return text

## Collapse static parts by material. Machines retain their moving subassemblies;
## the floor doesn't pay a draw call for every bolt and railing segment.
static func batch(parent: Node3D, excluded: Array = []) -> void:
	var groups: Dictionary = {}
	_collect_meshes(parent,parent,excluded,groups)
	for key in groups:
		var group: Array=groups[key]
		var surface:=SurfaceTool.new()
		surface.begin(Mesh.PRIMITIVE_TRIANGLES)
		var material_ref: Material=group[0].material_override
		for source: MeshInstance3D in group:
			var transform: Transform3D=parent.global_transform.affine_inverse()*source.global_transform
			surface.append_from(source.mesh,0,transform)
		var merged:=MeshInstance3D.new()
		merged.mesh=surface.commit()
		merged.material_override=material_ref
		parent.add_child(merged)
		for source: MeshInstance3D in group:
			source.get_parent().remove_child(source)
			source.queue_free()

static func _collect_meshes(root: Node3D, node: Node3D, excluded: Array, groups: Dictionary) -> void:
	for child in node.get_children():
		if child in excluded:continue
		if child is MeshInstance3D and child.material_override!=null and child.mesh!=null:
			var key: int=child.material_override.get_instance_id()
			if not groups.has(key):groups[key]=[]
			groups[key].append(child)
		elif child is Node3D:
			_collect_meshes(root,child,excluded,groups)
