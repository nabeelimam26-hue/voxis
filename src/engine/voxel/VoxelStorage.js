export const EMPTY_VOXEL_ID = 0;

class VoxelStorage {
  constructor({
    sizeX = 16,
    sizeY = 16,
    sizeZ = 16,
    defaultVoxel = EMPTY_VOXEL_ID,
    ArrayType = Uint16Array,
  } = {}) {
    this.sizeX = sizeX;
    this.sizeY = sizeY;
    this.sizeZ = sizeZ;
    this.defaultVoxel = defaultVoxel;
    this.ArrayType = ArrayType;
    this.data = new ArrayType(sizeX * sizeY * sizeZ);

    if (defaultVoxel !== EMPTY_VOXEL_ID) {
      this.data.fill(defaultVoxel);
    }
  }

  get volume() {
    return this.data.length;
  }

  inBounds(x, y, z) {
    return (
      x >= 0 &&
      y >= 0 &&
      z >= 0 &&
      x < this.sizeX &&
      y < this.sizeY &&
      z < this.sizeZ
    );
  }

  index(x, y, z) {
    if (!this.inBounds(x, y, z)) {
      return -1;
    }

    return x + this.sizeX * (y + this.sizeY * z);
  }

  getVoxel(x, y, z) {
    const index = this.index(x, y, z);

    if (index === -1) {
      return EMPTY_VOXEL_ID;
    }

    return this.data[index];
  }

  setVoxel(x, y, z, voxelId) {
    const index = this.index(x, y, z);

    if (index === -1) {
      return false;
    }

    if (this.data[index] === voxelId) {
      return false;
    }

    this.data[index] = voxelId;

    return true;
  }

  removeVoxel(x, y, z) {
    return this.setVoxel(x, y, z, EMPTY_VOXEL_ID);
  }

  clear(voxelId = this.defaultVoxel) {
    this.data.fill(voxelId);
  }

  cloneData() {
    return new this.ArrayType(this.data);
  }
}

export default VoxelStorage;
