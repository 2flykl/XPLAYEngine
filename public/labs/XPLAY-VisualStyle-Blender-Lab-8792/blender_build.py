import bpy,json,sys,os,math
if '--' not in sys.argv: raise RuntimeError('Missing job path')
job_path=sys.argv[sys.argv.index('--')+1]
with open(job_path,'r',encoding='utf-8') as f: job=json.load(f)
rig=job['rig'];style=job.get('style','64bit');out=job['outputPath']
bpy.ops.wm.read_factory_settings(use_empty=True);scene=bpy.context.scene;scene.unit_settings.system='METRIC';scene.unit_settings.scale_length=1.0

def mat(name,color,rough=.75,metal=0):
    m=bpy.data.materials.new(name);m.use_nodes=True;bsdf=m.node_tree.nodes.get('Principled BSDF');bsdf.inputs['Base Color'].default_value=(*color,1);bsdf.inputs['Roughness'].default_value=rough;bsdf.inputs['Metallic'].default_value=metal;return m
styles={'64bit':((.33,.56,.28),(.42,.45,.50),(.55,.38,.24)),'ps2':((.30,.54,.30),(.38,.42,.47),(.50,.35,.22)),'hd':((.25,.62,.30),(.42,.50,.58),(.65,.38,.20)),'modern':((.24,.50,.26),(.34,.40,.46),(.45,.31,.20)),'realistic':((.22,.42,.23),(.30,.34,.36),(.38,.27,.18))}
gcol,bcol,rcol=styles.get(style,styles['64bit']);gm=mat('XPLAY_GROUND_MAT',gcol,.9);bm=mat('XPLAY_BUILDING_MAT',bcol,.72);rm=mat('XPLAY_ROAD_MAT',rcol,.95);tm=mat('XPLAY_TOWER_MAT',(.22,.55,.65),.55,.05)
# Ground
bpy.ops.mesh.primitive_plane_add(size=2,location=(0,0,0));o=bpy.context.object;o.name='XPLAY_GROUND';o.scale=(rig['world']['width']/2,rig['world']['depth']/2,1);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(gm)
# Road
bpy.ops.mesh.primitive_cube_add(location=(0,5,.06));o=bpy.context.object;o.name='XPLAY_ROAD';o.dimensions=(10,95,.12);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(rm)
for lm in rig.get('landmarks',[]):
    sx,sy,sz=lm.get('size',[10,10,10]);x,y,z=lm['x'],lm['y'],lm['z'];tower=('tower' in lm['id'] or 'landmark' in lm['id'])
    if tower:bpy.ops.mesh.primitive_cylinder_add(vertices=8 if style=='64bit' else 20,radius=max(2,sx/2),depth=sz,location=(x,y,z+sz/2))
    else:
        bpy.ops.mesh.primitive_cube_add(location=(x,y,z+sz/2));bpy.context.object.dimensions=(sx,sy,sz);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    obj=bpy.context.object;obj.name=lm['objectName'];obj.data.materials.append(tm if tower else bm)
    if style!='64bit' and not tower:
        bpy.ops.mesh.primitive_cube_add(location=(x,y,z+sz+.45));cap=bpy.context.object;cap.name=lm['objectName']+'_ROOF';cap.dimensions=(sx*1.04,sy*1.04,.9);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);cap.data.materials.append(bm)
ps=rig['playerStart'];p=bpy.data.objects.new('XPLAY_PLAYER_START',None);scene.collection.objects.link(p);p.location=(ps['x'],ps['y'],ps['z'])
for lm in rig.get('landmarks',[]):
    e=bpy.data.objects.new('XPLAY_LANDMARK_'+lm['id'].upper(),None);scene.collection.objects.link(e);e.location=(lm['x'],lm['y'],lm['z'])
world=scene.world or bpy.data.worlds.new('World');scene.world=world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs['Color'].default_value=(.06,.08,.11,1);world.node_tree.nodes['Background'].inputs['Strength'].default_value=.7
ld=bpy.data.lights.new('XPLAY_SUN','SUN');ld.energy=3;sun=bpy.data.objects.new('XPLAY_SUN',ld);scene.collection.objects.link(sun);sun.rotation_euler=(math.radians(35),math.radians(-20),math.radians(25))
bpy.ops.export_scene.gltf(filepath=out,export_format='GLB',export_yup=True,export_apply=True,export_cameras=False,export_lights=False)
print('EXPORTED',out)
