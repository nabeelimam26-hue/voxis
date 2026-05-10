import VoxelChunk, { DEFAULT_CHUNK_SIZE } from "./VoxelChunk.js";
import { EMPTY_VOXEL_ID } from "./VoxelStorage.js";

const AIR_VOXEL = Object.freeze({
  id: EMPTY_VOXEL_ID,
  name: "air",
  solid: false,
  visible: false,
});

class VoxelWorld {
  constructor({ chunkSize = DEFAULT_CHUNK_SIZE, voxelTypes = [] } = {}) {
    this.chunkSize = chunkSize;
    this.chunks = new Map();
    this.voxelTypes = new Map([[EMPTY_VOXEL_ID, AIR_VOXEL]]);

    voxelTypes.forEach((voxelType) => {
      this.registerVoxelType(voxelType);
    });
  }

  registerVoxelType(voxelType) {
    if (!voxelType || typeof voxelType.id !== "number") {
      throw new Error("Voxel type definitions require a numeric id.");
    }

    this.voxelTypes.set(voxelType.id, Object.freeze({ ...voxelType }));
  }

  getVoxelType(voxelId) {
    return this.voxelTypes.get(voxelId) || null;
  }

  getChunk(chunkX, chunkY, chunkZ) {
    return this.chunks.get(VoxelChunk.key(chunkX, chunkY, chunkZ)) || null;
  }

  getOrCreateChunk(chunkX, chunkY, chunkZ) {
    const key = VoxelChunk.key(chunkX, chunkY, chunkZ);
    let chunk = this.chunks.get(key);

    if (!chunk) {
      chunk = new VoxelChunk({
        chunkX,
        chunkY,
        chunkZ,
        size: this.chunkSize,
      });
      this.chunks.set(key, chunk);
    }

    return chunk;
  }

  getVoxel(worldX, worldY, worldZ) {
    const { chunkX, chunkY, chunkZ, localX, localY, localZ } = this.worldToLocal(
      worldX,
      worldY,
      worldZ
    );
    const chunk = this.getChunk(chunkX, chunkY, chunkZ);

    if (!chunk) {
      return EMPTY_VOXEL_ID;
    }

    return chunk.getVoxel(localX, localY, localZ);
  }

  setVoxel(worldX, worldY, worldZ, voxelId) {
    const { chunkX, chunkY, chunkZ, localX, localY, localZ } = this.worldToLocal(
      worldX,
      worldY,
      worldZ
    );
    const chunk = this.getOrCreateChunk(chunkX, chunkY, chunkZ);
    const changed = chunk.setVoxel(localX, localY, localZ, voxelId);

    if (changed) {
      this.markBoundaryNeighborsDirty(chunkX, chunkY, chunkZ, localX, localY, localZ);
    }

    return changed;
  }

  removeVoxel(worldX, worldY, worldZ) {
    return this.setVoxel(worldX, worldY, worldZ, EMPTY_VOXEL_ID);
  }

  markChunkDirty(chunkX, chunkY, chunkZ, reason = "mesh") {
    const chunk = this.getChunk(chunkX, chunkY, chunkZ);

    if (chunk) {
      chunk.markDirty(reason);
    }
  }

  getDirtyChunks() {
    return [...this.chunks.values()].filter((chunk) => chunk.needsRebuild());
  }

  consumeDirtyChunks() {
    const dirtyChunks = this.getDirtyChunks();

    dirtyChunks.forEach((chunk) => {
      chunk.markClean();
    });

    return dirtyChunks;
  }

  worldToLocal(worldX, worldY, worldZ) {
    const chunkX = Math.floor(worldX / this.chunkSize);
    const chunkY = Math.floor(worldY / this.chunkSize);
    const chunkZ = Math.floor(worldZ / this.chunkSize);

    return {
      chunkX,
      chunkY,
      chunkZ,
      localX: this.toLocalCoordinate(worldX),
      localY: this.toLocalCoordinate(worldY),
      localZ: this.toLocalCoordinate(worldZ),
    };
  }

  toLocalCoordinate(value) {
    return ((value % this.chunkSize) + this.chunkSize) % this.chunkSize;
  }

  markBoundaryNeighborsDirty(chunkX, chunkY, chunkZ, localX, localY, localZ) {
    const max = this.chunkSize - 1;

    if (localX === 0) this.markChunkDirty(chunkX - 1, chunkY, chunkZ);
    if (localX === max) this.markChunkDirty(chunkX + 1, chunkY, chunkZ);
    if (localY === 0) this.markChunkDirty(chunkX, chunkY - 1, chunkZ);
    if (localY === max) this.markChunkDirty(chunkX, chunkY + 1, chunkZ);
    if (localZ === 0) this.markChunkDirty(chunkX, chunkY, chunkZ - 1);
    if (localZ === max) this.markChunkDirty(chunkX, chunkY, chunkZ + 1);
  }
}

export default VoxelWorld;
