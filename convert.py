import sys
import os
from plyfile import PlyData
import numpy as np
from io import BytesIO
import struct
from tqdm import tqdm
from numba import njit

# Normalize quaternion to unit length
def normalize_quaternion(q):
    norm = np.linalg.norm(q)
    return q / norm if norm != 0 else np.zeros_like(q)

@njit
def unique_colors_numba(colors, tol_sq, max_index_count):
    n = colors.shape[0]
    indices = np.full(n, 65535, dtype=np.uint16)
    unique_colors_list = np.zeros((max_index_count, 4), dtype=np.uint8)
    unique_count = 0

    for i in range(n):
        c0 = colors[i]
        found = False
       
        for j in range(unique_count):
            dist_sq = 0
            for k in range(4):
                diff = int(unique_colors_list[j, k]) - int(c0[k])
                dist_sq += diff * diff
            if dist_sq < tol_sq:
                indices[i] = j
                found = True
                break
        if not found:
            if unique_count >= max_index_count:
             
                return unique_colors_list[:unique_count], indices, True
            unique_colors_list[unique_count] = c0
            indices[i] = unique_count
            unique_count += 1
    return unique_colors_list[:unique_count], indices, False

def get_unique_colors_with_attempts(colors, initial_tol=100, max_index_count=65535, attempts=3):
    tol = initial_tol
    for attempt in range(attempts):
        print(f"Unique color search attempt {attempt+1} with tolerance={tol}")
        tol_sq = tol  
        unique_col, indices, overflow = unique_colors_numba(colors, tol_sq, max_index_count)
        unique_count = unique_col.shape[0]
        print(f"  Found unique colors: {unique_count}")
        if not overflow and unique_count <= max_index_count:
            return unique_col, indices
        tol = tol * 1.5
    raise ValueError(f"Too many unique colors even after {attempts} attempts; last count={unique_count}")

def process_ply_to_lsy(ply_file_path, initial_color_tolerance=100):
    print(f"Processing {ply_file_path} ...")
    plydata = PlyData.read(ply_file_path)
    vert = plydata['vertex']
    num_vertices = len(vert)


    print("Reading attributes...")
    positions = np.stack([vert['x'], vert['y'], vert['z']], axis=1).astype(np.float32)

    scales = np.exp(np.stack([vert['scale_0'], vert['scale_1'], vert['scale_2']], axis=1).astype(np.float32))
    quats = np.stack([vert['rot_0'], vert['rot_1'], vert['rot_2'], vert['rot_3']], axis=1).astype(np.float32)
    quats = np.array([normalize_quaternion(q) for q in quats], dtype=np.float32)


    SH_C0 = 0.28209479177387814
    colors = np.stack([
        0.5 + SH_C0 * vert['f_dc_0'],
        0.5 + SH_C0 * vert['f_dc_1'],
        0.5 + SH_C0 * vert['f_dc_2'],
        1 / (1 + np.exp(-vert['opacity']))
    ], axis=1)
    colors = (colors * 255).clip(0, 255).astype(np.uint8)


    print("Computing normalization parameters...")
    pos_min = positions.min(axis=0)
    pos_max = positions.max(axis=0)
    scale_min = scales.min(axis=0)
    scale_max = scales.max(axis=0)


    pos_range = np.where(pos_max > pos_min, pos_max - pos_min, 1)
    scale_range = np.where(scale_max > scale_min, scale_max - scale_min, 1)


    print("Quantizing positions and scales...")
    pos_quant = ((positions - pos_min) / pos_range * 65535).round().clip(0, 65535).astype(np.uint16)
    scale_quant = ((scales - scale_min) / scale_range * 255).round().clip(0, 255).astype(np.uint8)
    quat_quant = ((quats * 128 + 128).clip(0, 255)).astype(np.uint8)


    print("Finding unique colors with Numba acceleration...")
    unique_col, color_indices = get_unique_colors_with_attempts(colors, initial_color_tolerance)
    n_unique = unique_col.shape[0]
    print(f"Number of unique colors: {n_unique}")

   
    version = 3.0
    
    pos_bounds_js = [
        pos_min[0], pos_max[0],
        pos_min[1], pos_max[1],
        pos_min[2], pos_max[2]
    ]
    scale_bounds_js = [
        scale_min[0], scale_max[0],
        scale_min[1], scale_max[1],
        scale_min[2], scale_max[2]
    ]
    header_floats = [version] + pos_bounds_js + scale_bounds_js + [num_vertices, n_unique]
    header = np.array(header_floats, dtype=np.float32)
  
    print("Header floats:", header_floats)

   
    buffer = BytesIO()

    buffer.write(header.tobytes())  

   
    print("Writing positions...")
    for q in tqdm(pos_quant, desc="Positions", unit="point"):
      
        buffer.write(struct.pack('>HHH', int(q[0]), int(q[1]), int(q[2])))


    print("Writing scales...")
    for q in tqdm(scale_quant, desc="Scales", unit="point"):
        buffer.write(q.tobytes())


    print("Writing quaternions...")
    for q in tqdm(quat_quant, desc="Quaternions", unit="point"):
        buffer.write(q.tobytes())


    print("Writing color indices...")
    for idx in tqdm(color_indices, desc="Color indices", unit="point"):
        buffer.write(struct.pack('>H', int(idx)))


    print("Writing unique colors...")
    for col in tqdm(unique_col, desc="Unique colors", unit="color"):

        buffer.write(col.tobytes())

    return buffer.getvalue()

def main():
    if len(sys.argv) < 3:
        print("Usage: python convert.py <input.ply> <output.lsy> [colorTolerance]")
        sys.exit(1)

    input_ply = sys.argv[1]
    output_lsy = sys.argv[2]
    initial_tol = float(sys.argv[3]) if len(sys.argv) >= 4 else 100

    if not os.path.isfile(input_ply):
        print(f"Input file {input_ply} does not exist.")
        sys.exit(1)

    lsy_data = process_ply_to_lsy(input_ply, initial_color_tolerance=initial_tol)

    with open(output_lsy, "wb") as f:
        f.write(lsy_data)

    print(f"Converted {input_ply} to {output_lsy} successfully.")

if __name__ == "__main__":
    main()
