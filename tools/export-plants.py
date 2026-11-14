# Export des modèles du décor du Japon (models/japon/plants.bin + plants.json), à lancer dans Blender.
#
# Préparation (déjà faite pour les fichiers du dépôt) : importer les modèles de Poly Pizza (voir
# models/japon/LICENSE.txt), fusionner les sommets en double, simplifier (Decimate) puis nommer les objets
# prêts comme dans SPEC ci-dessous. Le script écrit, pour chaque triangle : position (origine au pied,
# hauteur 1, axe y vers le haut comme dans three.js), couleur d'origine (couleur du matériau, ou de la
# texture au centre du triangle), rôle (numéro du matériau d'origine) et morceau (partie d'un seul tenant).
import bpy, bmesh, struct, json, os

OUT = os.path.join(os.path.dirname(bpy.data.filepath) or '.', 'models', 'japon')
OUT = os.environ.get('ONIMA_PLANTS_OUT', OUT)
SPEC = {'X_tree': 'tree', 'X_conifer': 'conifer', 'X_rock1': 'rock1', 'X_rock2': 'rock2', 'X_rock3': 'rock3',
        'X_stall': 'stall', 'X_cart': 'cart', 'X_cabbage': 'cabbage', 'X_radish': 'radish', 'X_leek': 'leek'}


def lin2srgb(c):
    return 1.055 * (c ** (1 / 2.4)) - 0.055 if c > 0.0031308 else 12.92 * c


imgcache = {}


def img_px(img):
    if img.name not in imgcache:
        imgcache[img.name] = (img.size[0], img.size[1], list(img.pixels[:]))
    return imgcache[img.name]


def mat_info(m):
    bs = next((nd for nd in m.node_tree.nodes if nd.type == 'BSDF_PRINCIPLED'), None)
    base = tuple(lin2srgb(v) for v in bs.inputs['Base Color'].default_value[:3]) if bs else (0.8, 0.8, 0.8)
    tex = None
    if bs and bs.inputs['Base Color'].links:
        n = bs.inputs['Base Color'].links[0].from_node
        if n.type == 'TEX_IMAGE':
            tex = n.image
    return base, tex


os.makedirs(OUT, exist_ok=True)
index, blob = {}, bytearray()
for oname, key in SPEC.items():
    o = bpy.data.objects[oname]
    bm = bmesh.new()
    bm.from_mesh(o.data)
    bm.transform(o.matrix_world)
    bmesh.ops.triangulate(bm, faces=bm.faces)
    bm.faces.ensure_lookup_table()
    uvl = bm.loops.layers.uv.active
    comp, cid = {}, 0   # morceaux d'un seul tenant
    for f in bm.faces:
        if f.index in comp:
            continue
        st = [f]
        while st:
            x = st.pop()
            if x.index in comp:
                continue
            comp[x.index] = cid
            st.extend(g for e in x.edges for g in e.link_faces if g.index not in comp)
        cid += 1
    zs = [v.co.z for v in bm.verts]
    zmin, h = min(zs), max(zs) - min(zs)
    low = [v.co for v in bm.verts if v.co.z < zmin + 0.08 * h]   # pied : centre des sommets les plus bas
    cx, cy = sum(c.x for c in low) / len(low), sum(c.y for c in low) / len(low)
    minfo = [mat_info(s.material) for s in o.material_slots]
    pos, col, role, part, xs, zs2 = [], [], [], [], [], []
    for f in bm.faces:
        for l in f.loops:
            v = l.vert.co
            X, Y, Z = (v.x - cx) / h, (v.z - zmin) / h, -(v.y - cy) / h
            pos += [X, Y, Z]
            xs.append(X)
            zs2.append(Z)
        base, tex = minfo[f.material_index]
        c = base
        if tex is not None and uvl is not None:
            w, hh, px = img_px(tex)
            u = sum(l[uvl].uv.x for l in f.loops) / 3
            vv = sum(l[uvl].uv.y for l in f.loops) / 3
            k = ((int((vv % 1) * hh) % hh) * w + int((u % 1) * w) % w) * 4
            c = (px[k], px[k + 1], px[k + 2])
            if tex.colorspace_settings.name != 'sRGB':
                c = tuple(lin2srgb(x) for x in c)
        col += [max(0, min(255, round(x * 255))) for x in c]
        role.append(f.material_index)
        part.append(comp[f.index] % 65536)
    n = len(bm.faces)
    bm.free()
    while len(blob) % 4:
        blob.append(0)
    off = len(blob)
    blob += struct.pack(f'<{n * 9}f', *pos) + bytes(col) + bytes(role)
    while len(blob) % 4:
        blob.append(0)
    blob += struct.pack(f'<{n}H', *part)
    index[key] = {'off': off, 'tris': n, 'parts': cid, 'roles': [s.material.name for s in o.material_slots],
                  'w': round(max(xs) - min(xs), 3), 'd': round(max(zs2) - min(zs2), 3)}
    print(key, n, 'triangles,', cid, 'morceaux')
open(os.path.join(OUT, 'plants.bin'), 'wb').write(blob)
json.dump(index, open(os.path.join(OUT, 'plants.json'), 'w'), indent=1)
print(len(blob), 'octets')
