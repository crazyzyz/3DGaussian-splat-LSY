# 3DGaussian-splat-LSY

`.lsy` file format is a lightweight, highly compressed solution for representing 3D Gaussian Splat (3DGS) data derived from `.ply` or `.splat` files. This project provides tools to efficiently convert, compress, and render 3DGS content, optimized for web platforms and resource-constrained devices.

I look forward to your giving me a collection, because I will integrate it into unity later

---

## ✨ Features

✅ **Convert `.ply` to `.lsy`**
Efficiently compress and convert large `.ply` point cloud files into `.lsy` format with quantization, clustering, and optimized binary structure.

✅ **Web-based `.ply`/`.splat` to `.lsy` Conversion**
Support in-browser conversion of `.ply` or `.splat` files to `.lsy` format without server-side processing.

✅ **Web-based `.lsy` File Preview with Gaussian Rendering**
Drag & drop `.lsy` files into a web page to visualize real-time 3D Gaussian Splat renderings, ideal for lightweight web applications, VR devices, and mobile environments.

---

## 📁 File Size Comparison

| Format   | Typical Size | Compression Ratio |
| -------- | ------------ | ----------------- |
| `.ply`   | 257 MB       | Baseline          |
| `.splat` | 33.1 MB      | 7.63× smaller     |
| `.spz`   | 27.5 MB      | 9.35× smaller     |
| `.sogs`  | 20.8 MB      | 12.36× smaller    |
| `.lsy`   | 15.7 MB      | 16.37× smaller    |

![image](https://github.com/user-attachments/assets/8d47c99f-eefb-4f40-9d6a-1cdd19a791c8)

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
pip install numpy tqdm numba plyfile
```

### 2. Convert `.ply` to `.lsy`

```bash
python convert.py input.ply output.lsy 
```

* `colorTolerance` (optional): Controls color clustering threshold, default is `100`.

### 3. Web Usage

* Open the provided HTML demo.
* Drag `.lsy` files into the page to preview 3D Gaussian splats.
* You can also convert `.ply` or `.splat` files to `.lsy` in-browser (support for modern browsers).

---

## 💡 Applications

* 3D Web Visualization
* VR/AR Lightweight Rendering
* Mobile 3D Content Streaming
* Real-time Gaussian Splat Previews

---

## 📄 License

MIT License

---

