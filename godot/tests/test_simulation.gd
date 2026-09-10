extends SceneTree
const Simulation=preload("res://scripts/simulation.gd")
var failures: Array[String]=[]
var checks: int=0

func check(condition: bool, message: String) -> void:
	checks+=1
	if not condition:
		failures.append(message)
		push_error(message)

func advance(sim: SeedSimulation, seconds: float) -> void:
	for i in ceili(seconds*60):sim.step(1.0/60.0)

func _initialize() -> void:
	var sim:=Simulation.new()
	check(not sim.build_fab(),"Cannot buy an unfunded machine")
	check(sim.etch(),"Fresh run can etch")
	check(sim.wafers==59 and sim.chips==0,"Starting a cycle consumes one wafer but grants no output early")
	check(not sim.etch(),"Manual cycle cannot be double queued")
	advance(sim,1.0)
	check(sim.chips==1 and sim.capital==100,"Completed fabrication sells one chip for $100")
	for i in 11:
		sim.etch()
		advance(sim,1)
	check(sim.capital==1200,"Twelve manual chips finance the first machine")
	check(sim.build_fab() and sim.fabs==1 and sim.capital==0,"The first fab debits the displayed price")
	var before: int=sim.chips
	advance(sim,3.5)
	check(sim.chips>before,"An autonomous machine produces without manual input")
	var restored:=Simulation.new()
	check(restored.restore(sim.to_save()),"Save round trip is accepted")
	check(restored.to_save()==sim.to_save(),"Save preserves in-flight wafers and machine cycles")
	var bad: Dictionary=sim.to_save()
	bad.cycles=["broken"]
	check(not restored.restore(bad),"Corrupted cycle data is rejected")
	check(restored.to_save()==sim.to_save(),"Invalid restore leaves the entire current run unchanged")
	bad=sim.to_save()
	bad.version=999
	check(not restored.restore(bad),"Unknown save versions are rejected")
	var stranded:=Simulation.new()
	stranded.wafers=0
	stranded.capital=0
	check(stranded.reclaim() and stranded.wafers==3,"A bankrupt factory can recover without resetting")
	check(not stranded.reclaim(),"Emergency recovery cannot be stockpiled")
	check(not sim.upgrade(),"Overclock is gated to two fabs")
	check(not sim.toggle_controller(),"Automation is gated to three fabs")
	check(not sim.uplink(),"Uplink requires the full factory")
	# A complete headless playthrough follows the same transactions as the UI.
	# No privileged resources, time multiplier, free purchases, or state jumps.
	var run:=Simulation.new()
	var finished_at: float=0
	for i in range(60*600):
		if run.wafers<maxi(8,run.fabs*2):
			if not run.buy_wafers():run.reclaim()
		if run.fabs>=2 and not run.overclock:run.upgrade()
		if run.fabs<6:run.build_fab()
		if run.fabs>=3 and not run.controller:run.toggle_controller()
		run.etch()
		run.step(1.0/60)
		run.take_events()
		if run.uplink():
			finished_at=run.elapsed
			break
	check(run.linked,"The prototype can be completed from a fresh run within ten minutes")
	check(run.fabs==6 and run.overclock and run.controller,"A completed run uses the factory's expansion, research, and controller")
	check(run.capital>=0 and run.wafers>=0,"No transaction creates negative resources")
	var previous: int=run.chips
	advance(run,10)
	check(run.chips>previous,"Production continues after the district connects")
	var saved: Dictionary=run.to_save()
	var resumed:=Simulation.new()
	resumed.restore(saved)
	advance(run,10)
	advance(resumed,10)
	check(run.to_save()==resumed.to_save(),"Resumed automation behaves identically to uninterrupted play")
	print("The Seed: %d checks, %d failures. Full run: %.1fs, %d chips."%[checks,failures.size(),finished_at,run.chips])
	quit(0 if failures.is_empty() else 1)
