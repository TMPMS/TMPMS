import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MERIDIANS_CATALOG } from '../../data/meridianData';
import { fetchMeridianAnalysis } from '../../services/api';
import './Meridian3DModal.css';

// Model giải phẫu 3D thật (thay cho mannequin dựng bằng hình khối) — đặt tại public/models nên
// Vite copy nguyên vẹn, không qua build pipeline; chỉ tải khi modal mở (không vào bundle chính).
const MODEL_URL = '/models/human-anatomy.glb';
const MODEL_CREDIT = {
  title: 'Ecorche - Anatomy study',
  author: 'Beatriz Gomez Santamaria',
  url: 'https://sketchfab.com/3d-models/ecorche-anatomy-study-e402d3d541eb4b199c57d5410f5d3c57'
};

// Co giãn & căn giữa model tải về cho khớp quy ước tọa độ của meridianData.js
// (chân ~y=-1.78, đỉnh đầu ~y=1.7), bất kể tỉ lệ/gốc tọa độ gốc của file.
function fitModelToScene(model) {
  // Bắt buộc cập nhật matrixWorld đệ quy cho toàn bộ node con trước khi đo bounding box —
  // model vừa tải xong chưa được add vào scene nên matrixWorld có thể chưa phản ánh đúng
  // transform thật của từng node (một số file glTF áp scale rất nhỏ ở node gốc để quy đổi đơn vị).
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  box.getSize(size);
  if (!size.y) return;

  const targetHeight = 3.5;
  model.scale.setScalar(targetHeight / size.y);

  const fittedBox = new THREE.Box3().setFromObject(model);
  const center = new THREE.Vector3();
  fittedBox.getCenter(center);
  model.position.x -= center.x;
  model.position.z -= center.z;
  model.position.y += -1.78 - fittedBox.min.y;
}

// Đường đi minh họa (không phải tọa độ y khoa chính xác) cho từng đường kinh, dùng để vẽ glow line trên mô hình 3D.
const MERIDIAN_PATHS = {
  PHE: [[0.36, 1.28, 0.05], [0.5, 0.9, 0.08], [0.62, 0.5, 0.1], [0.68, 0.25, 0.1]],
  TAM: [[0.34, 1.25, -0.02], [0.5, 0.85, 0], [0.6, 0.45, 0.02], [0.68, 0.2, 0.02]],
  TY: [[0.2, 0.6, 0.1], [0.22, 0.0, 0.12], [0.22, -0.7, 0.1], [0.2, -1.4, 0.08]],
  CAN: [[0.18, -1.75, 0.1], [0.2, -1.1, 0.12], [0.18, -0.4, 0.1], [0.1, 0.1, 0.08]],
  THAN: [[0.1, 0.15, 0.05], [0.12, -0.5, 0.08], [0.14, -1.1, 0.08], [0.15, -1.7, 0.06]],
  VI: [[0.12, 1.2, 0.25], [0.14, 0.6, 0.28], [0.16, -0.1, 0.25], [0.16, -0.9, 0.2], [0.15, -1.7, 0.15]]
};

// Tra cứu ý nghĩa mã kinh trong mã huyệt (vd "BL13" -> chữ "BL"). Chỉ hiển thị các mã THẬT SỰ
// xuất hiện trong huyệt vị của sản phẩm đang xem, không liệt kê hết cho đỡ rối.
const MERIDIAN_CODE_MEANINGS = {
  LU: 'Phế (Lung)', HT: 'Tâm (Heart)', SP: 'Tỳ (Spleen)', LR: 'Can (Liver)',
  KI: 'Thận (Kidney)', ST: 'Vị (Stomach)', BL: 'Bàng Quang (Bladder)',
  PC: 'Tâm Bào (Pericardium)', CV: 'Nhâm mạch (Conception Vessel)', GV: 'Đốc mạch (Governing Vessel)'
};

function buildLimb(start, end, radiusTop, radiusBottom, material) {
  const startV = new THREE.Vector3(...start);
  const endV = new THREE.Vector3(...end);
  const dir = new THREE.Vector3().subVectors(endV, startV);
  const length = dir.length();
  const geometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, length, 16);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(new THREE.Vector3().addVectors(startV, endV).multiplyScalar(0.5));
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  return mesh;
}

function buildJoint(point, radius, material) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 16), material);
  mesh.position.set(...point);
  return mesh;
}

function buildBodyGroup() {
  const group = new THREE.Group();
  // Vật liệu "hologram y khoa": trong mờ, ánh sáng xanh cyan phát ra từ trong,
  // thay cho khối xám phẳng trước đây trông thô và thiếu chiều sâu.
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0x7dd3fc,
    transparent: true,
    opacity: 0.3,
    roughness: 0.2,
    metalness: 0.1,
    emissive: 0x0ea5e9,
    emissiveIntensity: 0.35,
    side: THREE.DoubleSide
  });
  const jointMaterial = new THREE.MeshStandardMaterial({
    color: 0x7dd3fc,
    transparent: true,
    opacity: 0.4,
    roughness: 0.2,
    metalness: 0.1,
    emissive: 0x0ea5e9,
    emissiveIntensity: 0.45
  });

  const shoulderL = [-0.3, 1.27, 0];
  const shoulderR = [0.3, 1.27, 0];
  const elbowL = [-0.5, 0.86, 0.04];
  const elbowR = [0.5, 0.86, 0.04];
  const wristL = [-0.6, 0.4, 0.08];
  const wristR = [0.6, 0.4, 0.08];
  const hipL = [-0.14, -0.05, 0];
  const hipR = [0.14, -0.05, 0];
  const kneeL = [-0.16, -0.95, 0.02];
  const kneeR = [0.16, -0.95, 0.02];
  const ankleL = [-0.16, -1.68, 0];
  const ankleR = [0.16, -1.68, 0];

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 28, 28), bodyMaterial);
  head.position.set(0, 1.58, 0);
  group.add(head);

  group.add(buildLimb([0, 1.35, 0], [0, 1.47, 0], 0.08, 0.09, bodyMaterial));

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.22, 1.1, 20), bodyMaterial);
  torso.position.set(0, 0.72, 0);
  group.add(torso);

  const hips = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.18, 0.3, 20), bodyMaterial);
  hips.position.set(0, 0.05, 0);
  group.add(hips);

  [
    [shoulderL, shoulderR],
    [elbowL, elbowR],
    [wristL, wristR],
    [hipL, hipR],
    [kneeL, kneeR],
    [ankleL, ankleR]
  ].forEach(([left, right]) => {
    group.add(buildJoint(left, 0.085, jointMaterial));
    group.add(buildJoint(right, 0.085, jointMaterial));
  });

  [
    [shoulderL, elbowL, 0.085, 0.07],
    [elbowL, wristL, 0.07, 0.055],
    [shoulderR, elbowR, 0.085, 0.07],
    [elbowR, wristR, 0.07, 0.055],
    [hipL, kneeL, 0.12, 0.095],
    [kneeL, ankleL, 0.095, 0.06],
    [hipR, kneeR, 0.12, 0.095],
    [kneeR, ankleR, 0.095, 0.06]
  ].forEach(([start, end, rTop, rBottom]) => {
    group.add(buildLimb(start, end, rTop, rBottom, bodyMaterial));
  });

  [wristL, wristR].forEach((p) => group.add(buildJoint(p, 0.06, jointMaterial)));
  [ankleL, ankleR].forEach((p) => {
    const foot = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 16), jointMaterial);
    foot.position.set(p[0], p[1] - 0.06, p[2] + 0.05);
    foot.scale.set(1, 0.6, 1.6);
    group.add(foot);
  });

  // Vành sáng dưới chân — gợi cảm giác "bệ quét hologram" của giao diện y khoa tương lai.
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.5, 0.56, 48),
    new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(0, -1.78, 0);
  group.add(ring);

  return group;
}

// Tự động canh camera theo kích thước THẬT của model đã add vào scene, thay vì đoán cứng
// một vị trí camera cố định — tránh lặp lại lỗi camera zoom sai khi tỉ lệ model thay đổi.
function frameCameraOnObject(camera, controls, object) {
  const box = new THREE.Box3().setFromObject(object);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const fovRad = (camera.fov * Math.PI) / 180;
  const distance = (maxDim / 2 / Math.tan(fovRad / 2)) * 1.7;

  const dir = new THREE.Vector3(0.55, 0.25, 0.8).normalize();
  camera.position.copy(center).addScaledVector(dir, distance);
  camera.near = Math.max(distance / 100, 0.01);
  camera.far = distance * 20;
  camera.updateProjectionMatrix();

  controls.target.copy(center);
  controls.minDistance = distance * 0.3;
  controls.maxDistance = distance * 3;
  controls.update();
}

const MERIDIAN_SHORT_NAMES = { PHE: 'Phế', THAN: 'Thận', TY: 'Tỳ', CAN: 'Can', TAM: 'Tâm', VI: 'Vị' };

// Nhãn chữ nổi luôn quay mặt về camera (Sprite) — vẽ vào canvas 2D rồi dùng làm texture.
// Đặt depthTest=false để nhãn luôn hiện rõ, không bị cơ/xương của model che khuất.
function createLabelSprite(text, color, fontSize = 44) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = `bold ${fontSize}px sans-serif`;
  const padding = 16;
  const textWidth = ctx.measureText(text).width;
  canvas.width = textWidth + padding * 2;
  canvas.height = fontSize + padding * 1.4;

  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  const r = canvas.height / 2;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
  ctx.beginPath();
  ctx.roundRect(0, 0, canvas.width, canvas.height, r);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 1);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, depthTest: false, depthWrite: false, transparent: true });
  const sprite = new THREE.Sprite(material);
  const worldHeight = 0.13;
  sprite.scale.set(worldHeight * (canvas.width / canvas.height), worldHeight, 1);
  sprite.renderOrder = 999;
  return sprite;
}

function buildMeridianLine(points, color) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const geometry = new THREE.TubeGeometry(curve, 32, 0.016, 8, false);
  const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 });
  return new THREE.Mesh(geometry, material);
}

const Meridian3DModal = ({ product, curatedData, onClose }) => {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const [meridianData, setMeridianData] = useState(curatedData ? { ...curatedData, source: 'curated' } : null);
  const [loading, setLoading] = useState(!curatedData);
  const [error, setError] = useState('');
  const [selectedAcupoint, setSelectedAcupoint] = useState(curatedData?.acupoints?.[0] || null);
  const [showCodeExplainer, setShowCodeExplainer] = useState(false);
  const [modelStatus, setModelStatus] = useState('loading'); // 'loading' | 'ready'
  const [modelProgress, setModelProgress] = useState(0);

  // 1. Xác định nguồn dữ liệu: ưu tiên dữ liệu tĩnh đã kiểm duyệt, chỉ gọi AI khi không có.
  useEffect(() => {
    if (curatedData || !product?.id) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    fetchMeridianAnalysis(product.id)
      .then((res) => {
        if (cancelled) return;
        const mapped = {
          nature: res.nature,
          meridians: res.meridians,
          functions: res.functions,
          acupoints: res.acupoints,
          source: res.isAiGenerated ? 'ai' : 'ai-fallback',
          disclaimer: res.disclaimer
        };
        setMeridianData(mapped);
        setSelectedAcupoint(mapped.acupoints?.[0] || null);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Không thể phân tích quy kinh.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [curatedData, product?.id]);

  // 2. Khởi tạo scene Three.js — chỉ chạy lại khi dữ liệu quy kinh/huyệt vị thay đổi.
  useEffect(() => {
    if (!meridianData || !mountRef.current) return;
    const container = mountRef.current;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(1.8, 0.6, 2.4);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.15);
    keyLight.position.set(2, 3, 2);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0xbfdbfe, 0.4);
    rimLight.position.set(-2, 1, -2);
    scene.add(rimLight);

    let disposed = false;
    setModelStatus('loading');
    setModelProgress(0);
    new GLTFLoader().load(
      MODEL_URL,
      (gltf) => {
        if (disposed) return;
        fitModelToScene(gltf.scene);
        scene.add(gltf.scene);
        frameCameraOnObject(camera, controls, gltf.scene);
        setModelStatus('ready');
      },
      (xhr) => {
        if (disposed || !xhr.total) return;
        setModelProgress(Math.round((xhr.loaded / xhr.total) * 100));
      },
      (err) => {
        console.error('[Meridian3DModal] Không tải được model giải phẫu 3D, dùng mô hình dự phòng:', err);
        if (disposed) return;
        const fallbackBody = buildBodyGroup();
        scene.add(fallbackBody);
        frameCameraOnObject(camera, controls, fallbackBody);
        setModelStatus('ready');
      }
    );

    const activeMeridians = (meridianData.meridians || []).filter((k) => MERIDIANS_CATALOG[k] && MERIDIAN_PATHS[k]);
    const meridianMeshes = activeMeridians.map((key) => {
      const mesh = buildMeridianLine(MERIDIAN_PATHS[key], MERIDIANS_CATALOG[key].color);
      scene.add(mesh);
      // Nhãn tên đường kinh nổi ngay cạnh đường — để hiểu ngay không cần đối chiếu bảng bên cạnh.
      const path = MERIDIAN_PATHS[key];
      const midPoint = path[Math.floor(path.length / 2)];
      const label = createLabelSprite(MERIDIAN_SHORT_NAMES[key] || key, MERIDIANS_CATALOG[key].color);
      label.position.set(midPoint[0] + 0.14, midPoint[1], midPoint[2]);
      scene.add(label);
      return mesh;
    });

    const pinGroup = new THREE.Group();
    const pinMeshes = [];
    (meridianData.acupoints || []).forEach((pt) => {
      const isSelected = selectedAcupoint?.code === pt.code;
      const material = new THREE.MeshStandardMaterial({
        color: isSelected ? 0xef4444 : 0x10b981,
        emissive: isSelected ? 0xef4444 : 0x10b981,
        emissiveIntensity: 0.5
      });
      const pos = pt.position || [0, 0, 0];
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 16), material);
      mesh.position.set(...pos);
      mesh.userData.acupoint = pt;
      pinGroup.add(mesh);
      pinMeshes.push(mesh);

      // Nhãn mã huyệt vị (vd "ST36") nổi ngay trên chấm — bấm vào chấm để xem chi tiết đầy đủ.
      const pinLabel = createLabelSprite(pt.code || pt.name, '#f8fafc', 36);
      pinLabel.position.set(pos[0], pos[1] + 0.09, pos[2]);
      pinGroup.add(pinLabel);
    });
    scene.add(pinGroup);

    // Chú thích nổi ngay tại điểm được chọn trên model — không cần nhìn xuống bảng bên dưới mới hiểu.
    // Đặt vào .m3d-canvas-container (cha của container) để không bị "overflow: hidden" của canvas cắt mất.
    const tooltipParent = container.parentElement || container;
    const tooltipEl = document.createElement('div');
    tooltipEl.className = 'm3d-pin-tooltip';
    tooltipEl.style.display = 'none';
    tooltipParent.appendChild(tooltipEl);

    const updateTooltipContent = (acupoint) => {
      const title = acupoint.name?.includes(acupoint.code) ? acupoint.name : `${acupoint.name} (${acupoint.code})`;
      tooltipEl.innerHTML = `<strong>${title}</strong><span>${acupoint.benefit || ''}</span>`;
    };

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.4, 0);
    controls.enableDamping = true;
    controls.minDistance = 1.2;
    controls.maxDistance = 5;
    controls.update();

    let selectedPinMesh = pinMeshes.find((m) => m.userData.acupoint.code === selectedAcupoint?.code) || null;
    if (selectedPinMesh) updateTooltipContent(selectedPinMesh.userData.acupoint);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const handleClick = (event) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(pinMeshes);
      if (hits.length > 0) {
        const hitMesh = hits[0].object;
        pinMeshes.forEach((mesh) => {
          const isHit = mesh === hitMesh;
          mesh.material.color.set(isHit ? 0xef4444 : 0x10b981);
          mesh.material.emissive.set(isHit ? 0xef4444 : 0x10b981);
        });
        selectedPinMesh = hitMesh;
        updateTooltipContent(hitMesh.userData.acupoint);
        setSelectedAcupoint(hitMesh.userData.acupoint);
      }
    };
    renderer.domElement.addEventListener('click', handleClick);

    let frameId;
    let lastTime = performance.now();
    let elapsed = 0;
    const tooltipVec = new THREE.Vector3();
    const animate = () => {
      const now = performance.now();
      elapsed += (now - lastTime) / 1000;
      lastTime = now;
      meridianMeshes.forEach((mesh, i) => {
        mesh.material.opacity = 0.55 + Math.sin(elapsed * 2 + i) * 0.3;
      });
      controls.update();
      renderer.render(scene, camera);

      if (selectedPinMesh && container.clientWidth) {
        tooltipVec.setFromMatrixPosition(selectedPinMesh.matrixWorld).project(camera);
        if (tooltipVec.z < 1) {
          tooltipEl.style.display = 'block';
          tooltipEl.style.left = `${(tooltipVec.x * 0.5 + 0.5) * container.clientWidth}px`;
          tooltipEl.style.top = `${(-tooltipVec.y * 0.5 + 0.5) * container.clientHeight}px`;
        } else {
          tooltipEl.style.display = 'none';
        }
      }

      frameId = requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
      if (!container.clientWidth || !container.clientHeight) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    sceneRef.current = { renderer, animate, handleResize, handleClick };

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('click', handleClick);
      tooltipEl.remove();
      controls.dispose();
      scene.traverse((obj) => {
        // THREE.Sprite dùng geometry mặc định DÙNG CHUNG toàn ứng dụng — tuyệt đối không dispose,
        // nếu không mọi Sprite khác (kể cả ở modal mở sau) sẽ vỡ. Chỉ dispose material/texture riêng của nó.
        if (obj.isSprite) {
          obj.material.map?.dispose();
          obj.material.dispose();
          return;
        }
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
      });
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
    // selectedAcupoint chỉ ảnh hưởng màu pin — không cần rebuild toàn bộ scene khi nó đổi,
    // pin selection được cập nhật riêng ở effect bên dưới.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meridianData]);

  const activeMeridians = (meridianData?.meridians || []).map((k) => MERIDIANS_CATALOG[k]).filter(Boolean);
  // Chỉ những mã kinh THẬT SỰ xuất hiện trong huyệt vị của sản phẩm đang xem — không liệt kê hết cho đỡ rối.
  const usedCodePrefixes = [...new Set(
    (meridianData?.acupoints || []).map((pt) => pt.code?.match(/^[A-Za-z]+/)?.[0]).filter(Boolean)
  )];

  return (
    <div className="m3d-overlay" onClick={onClose}>
      <div className="m3d-card" onClick={(e) => e.stopPropagation()}>
        <button className="m3d-close" onClick={onClose}>✕</button>

        <div className="m3d-header">
          <div className="m3d-badges">
            <span className="m3d-badge-tag">🌐 MÔ HÌNH 3D QUY KINH</span>
            {meridianData?.source === 'curated' && (
              <span className="m3d-badge m3d-badge-verified">✅ Đã kiểm duyệt</span>
            )}
            {meridianData?.source === 'ai' && (
              <span className="m3d-badge m3d-badge-ai">🤖 AI suy luận — chưa kiểm chứng</span>
            )}
            {meridianData?.source === 'ai-fallback' && (
              <span className="m3d-badge m3d-badge-neutral">ℹ️ Dữ liệu tổng quát</span>
            )}
          </div>
          <h2>Sơ Đồ Quy Kinh & Huyệt Vị: <span className="m3d-highlight">{product?.name}</span></h2>
          {meridianData?.nature && <p className="m3d-nature">Tính vị: {meridianData.nature}</p>}
          {meridianData?.source !== 'curated' && meridianData?.disclaimer && (
            <p className="m3d-disclaimer">{meridianData.disclaimer}</p>
          )}
        </div>

        <div className="m3d-body">
          <div className="m3d-canvas-wrap">
            {loading && <div className="m3d-status">Đang phân tích quy kinh bằng AI…</div>}
            {error && !loading && <div className="m3d-status m3d-status-error">{error}</div>}
            {!loading && !error && meridianData && (
              <div className="m3d-canvas-container">
                <div className="m3d-canvas" ref={mountRef} />
                {modelStatus === 'loading' && (
                  <div className="m3d-model-loading-overlay">
                    Đang tải mô hình giải phẫu 3D… {modelProgress}%
                  </div>
                )}
              </div>
            )}
            {!loading && !error && meridianData && (
              <>
                <div className="m3d-hint">💡 Kéo chuột để xoay, cuộn để zoom, bấm vào huyệt vị (chấm xanh/đỏ) để xem chi tiết</div>
                <div className="m3d-credit">
                  Mô hình giải phẫu: <a href={MODEL_CREDIT.url} target="_blank" rel="noopener noreferrer">{MODEL_CREDIT.title}</a> bởi {MODEL_CREDIT.author} (CC BY 4.0)
                </div>
              </>
            )}
          </div>

          <div className="m3d-info-panel">
            <div className="m3d-section">
              <h3>🎯 Các Đường Kinh Lạc Quy Vào:</h3>
              <div className="m3d-meridians-grid">
                {activeMeridians.map((m) => (
                  <div key={m.id} className="m3d-meridian-card" style={{ borderLeftColor: m.color }}>
                    <div className="m3d-meridian-header">
                      <span style={{ color: m.color, fontWeight: 700 }}>{m.name}</span>
                      <span className="m3d-meridian-element">{m.element}</span>
                    </div>
                    <p>{m.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {meridianData?.functions && (
              <div className="m3d-section">
                <h3>⚡ Công Năng & Trị Liệu:</h3>
                <p className="m3d-functions-text">{meridianData.functions}</p>
              </div>
            )}

            {meridianData?.acupoints?.length > 0 && (
              <div className="m3d-section">
                <h3>📌 Huyệt Vị Bổ Trợ:</h3>
                <p className="m3d-acupoint-intro">
                  Đây là các huyệt vị nằm trên cùng đường kinh mà vị thuốc quy vào. Theo Đông y, bấm/xoa các điểm
                  này được cho là hỗ trợ tăng hiệu quả khi dùng thuốc. Bấm vào từng chấm sáng trên mô hình 3D
                  (hoặc nhãn cạnh chấm) để xem chi tiết từng huyệt.
                </p>
                {selectedAcupoint && (
                  <div className="m3d-acupoint-card">
                    <h4>
                      {selectedAcupoint.name?.includes(selectedAcupoint.code)
                        ? selectedAcupoint.name
                        : `${selectedAcupoint.name} (${selectedAcupoint.code})`}
                    </h4>
                    <p><strong>Vị trí giải phẫu:</strong> {selectedAcupoint.location}</p>
                    <p><strong>Tác dụng trị liệu:</strong> {selectedAcupoint.benefit}</p>
                  </div>
                )}

                <button
                  type="button"
                  className="m3d-code-explainer-toggle"
                  onClick={() => setShowCodeExplainer((v) => !v)}
                >
                  ℹ️ Mã huyệt vị (vd. BL13, ST36) nghĩa là gì? {showCodeExplainer ? '▲' : '▼'}
                </button>

                {showCodeExplainer && (
                  <div className="m3d-code-explainer">
                    <p>
                      Mỗi mã gồm <strong>2 phần</strong>: chữ cái đứng đầu là <strong>tên đường kinh</strong> chứa
                      huyệt đó, số phía sau là <strong>thứ tự huyệt trên đường kinh</strong> (đếm từ điểm đầu
                      kinh). Đây là hệ mã quốc tế theo Tổ chức Y tế Thế giới (WHO) dùng trong châm cứu.
                    </p>
                    <table className="m3d-code-table">
                      <tbody>
                        {usedCodePrefixes.map((code) => (
                          <tr key={code}>
                            <td>{code}</td>
                            <td>{MERIDIAN_CODE_MEANINGS[code] || 'Không rõ'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {usedCodePrefixes.includes('BL') && (
                      <p>
                        <strong>Lưu ý riêng với mã "BL":</strong> có một nhóm huyệt đặc biệt gọi là{' '}
                        <strong>"Bối Du huyệt"</strong> — nằm dọc hai bên cột sống, về vị trí thuộc kinh Bàng Quang
                        (nên mang mã BL), nhưng mỗi huyệt trong nhóm này lại gắn với công năng của một tạng phủ
                        khác — ví dụ <strong>BL13 (Phế Du)</strong> tuy mã BL nhưng dùng để bổ Phế. Tức là "kinh
                        chứa huyệt" và "tạng được bổ trợ" là hai khái niệm khác nhau.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="m3d-footer">
          <button className="m3d-btn-close" onClick={onClose}>Đóng Sơ Đồ</button>
        </div>
      </div>
    </div>
  );
};

export default Meridian3DModal;
