import VoxelStorage, { EMPTY_VOXEL_ID } from "./VoxelStorage.js";

export const DEFAULT_CHUNK_SIZE = 16;

class VoxelChunk {
  constructor({
    chunkX = 0,
    chunkY = 0,
    chunkZ = 0,
    size = DEFAULT_CHUNK_SIZE,
    storage = null,
  } = {}) {
    this.chunkX = chunkX;
    this.chunkY = chunkY;
    this.chunkZ = chunkZ;
    this.size = size;
    this.storage = storage || new VoxelStorage({
      sizeX: size,
      sizeY: size,
      sizeZ: size,
    });
    this.revision = 0;
    this.dirty = {
      voxels: false,
      mesh: false,
    };
  }

  get key() {
    return VoxelChunk.key(this.chunkX, this.chunkY, this.chunkZ);
  }

  static key(chunkX, chunkY, chunkZ) {
    return `${chunkX},${chunkY},${chunkZ}`;
  }

  containsLocal(x, y, z) {
    return this.storage.inBounds(x, y, z);
  }

  getVoxel(x, y, z) {
    return this.storage.getVoxel(x, y, z);
  }

  setVoxel(x, y, z, voxelId) {
    const changed = this.storage.setVoxel(x, y, z, voxelId);

    if (changed) {
      this.markDirty("voxels");
      this.markDirty("mesh");
      this.revision += 1;
    }

    return changed;
  }

  removeVoxel(x, y, z) {
    return this.setVoxel(x, y, z, EMPTY_VOXEL_ID);
  }

  markDirty(reason = "mesh") {
    this.dirty[reason] = true;
  }

  markClean(reason = null) {
    if (reason) {
      this.dirty[reason] = false;
      return;
    }

    Object.keys(this.dirty).forEach((key) => {
      this.dirty[key] = false;
    });
  }

  needsRebuild() {
    return this.dirty.mesh || this.dirty.voxels;
  }

  isEmpty() {
    return this.storage.data.every((voxelId) => voxelId === EMPTY_VOXEL_ID);
  }
}

export default VoxelChunk;
