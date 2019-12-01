import React from 'react';
import CropFrame from './CropFrame';
import './App.scss';

enum Status {
  None = 'NONE',
  Ready = 'READY',
  Creating = 'CREATING',
  Cropping = 'CROPPING',
  Moving = 'MOVING',
  Resizing = 'RESIZING',
}

interface Rectangle {
  top: number,
  left: number,
  bottom: number,
  right: number,
}

interface Point {
  x: number,
  y: number,
}

interface CropMakingDispatch {
  [key: string]: (
    start: Point,
    diffX: number,
    diffY: number
    ) => { top: number, left: number, bottom: number, right: number }
}

const createCrop: CropMakingDispatch = {
  ne: (start, width, height) => (
    {
      top: start.y - height,
      left: start.x,
      bottom: start.y,
      right: start.x + width,
    }),
  nw: (start, width, height) => (
    {
      top: start.y - height,
      left: start.x - width,
      bottom: start.y,
      right: start.x,
    }),
  se: (start, width, height) => (
    {
      top: start.y,
      left: start.x,
      bottom: start.y + height,
      right: start.x + width,
    }),
  sw: (start, width, height) => (
    {
      top: start.y,
      left: start.x - width,
      bottom: start.y + height,
      right: start.x,
    }),
};

const getSize = (rect: Rectangle) => ({
  width: rect.right - rect.left,
  height: rect.bottom - rect.top,
});

const checkCropBorders = (crop: Rectangle, parentSize: Rectangle): Rectangle => {
  const minTop = 0;
  const minLeft = 0;
  const top = Math.max(minTop, crop.top);
  const left = Math.max(minLeft, crop.left);
  const bottom = Math.min(crop.bottom, parentSize.bottom);
  const right = Math.min(crop.right, parentSize.right);

  return {
    top,
    left,
    bottom,
    right,
  }
};

const getNewCrop = (start: Point, end: Point, parentSize: Rectangle): Rectangle => {
  const xDir = end.x >= start.x ? 'e' : 'w';
  const yDir = end.y >= start.y ? 's' : 'n';
  const dir = `${yDir}${xDir}`;

  const minWidth = 10;
  const minHeight = 10;

  const diffX = Math.abs(end.x - start.x);
  const diffY = Math.abs(end.y - start.y);
  const width = Math.max(diffX, minWidth);
  const height = Math.max(diffY, minHeight);

  const relativeStart = {
    x: start.x - parentSize.left,
    y: start.y - parentSize.top,
  }

  const newCrop = createCrop[dir](relativeStart, width, height);

  return checkCropBorders(newCrop, parentSize);
};

interface CropResizingDispatch {
  [key: string]: (
    crop: Rectangle,
    diffX: number,
    diffY: number,
    minW: number,
    minH: number
  ) => Rectangle
}

const resizeCrop: CropResizingDispatch = {
  ne: (crop, diffX, diffY, minW, minH) => (
    {
      top: Math.min(crop.top + diffY, crop.bottom - minH),
      left: crop.left,
      bottom: crop.bottom,
      right: Math.max(crop.right + diffX, crop.left + minW),
    }),
  nw: (crop, diffX, diffY, minW, minH) => (
    {
      top: Math.min(crop.top + diffY, crop.bottom - minH),
      left: Math.min(crop.left + diffX, crop.right - minW),
      bottom: crop.bottom,
      right: crop.right,
    }),
  se: (crop, diffX, diffY, minW, minH) => (
    {
      top: crop.top,
      left: crop.left,
      bottom: Math.max(crop.bottom + diffY, crop.top + minH),
      right: Math.max(crop.right + diffX, crop.left + minW),
    }),
  sw: (crop, diffX, diffY, minW, minH) => (
    {
      top: crop.top,
      left: Math.min(crop.left + diffX, crop.right - minW),
      bottom: Math.max(crop.bottom + diffY, crop.top + minH),
      right: crop.right,
    }),
};

const getMinMax = (min: number, max: number, value: number) => Math.max(min, Math.min(max, value));

const getResizedCrop = (crop: Rectangle, corner: string, start: Point, end: Point, parent: Rectangle): Rectangle => {
  const minWidth = 10;
  const minHeight = 10;

  const diffX = end.x - start.x;
  const diffY = end.y - start.y;

  const newCrop = resizeCrop[corner](crop, diffX, diffY, minWidth, minHeight);
  return checkCropBorders(newCrop, parent);
};

const getMovedCrop = (crop: Rectangle, start: Point, end: Point, parentSize: Rectangle) => {
  const mouseDiffX = end.x - start.x;
  const mouseDiffY = end.y - start.y;

  const { width, height } = getSize(crop);
  const maxTop = parentSize.bottom - height;
  const maxLeft = parentSize.right - width;
  const minTop = 0;
  const minLeft = 0;
  const top = getMinMax(minTop, maxTop, crop.top + mouseDiffY);
  const left = getMinMax(minLeft, maxLeft, crop.left + mouseDiffX);

  return {
    top,
    left,
    bottom: top + height,
    right: left + width,
  };
};

const getCroppedImg = (image: HTMLImageElement, crop: Rectangle) => {
  const canvas = document.createElement('canvas');
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  const { width, height } = getSize(crop);
  canvas.width = width * scaleX;
  canvas.height = height * scaleY;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return new Promise((resolve, reject) => {
      reject();
    });
  }

  ctx.drawImage(
    image,
    crop.left * scaleX,
    crop.top * scaleY,
    width * scaleX,
    height * scaleY,
    0,
    0,
    width * scaleX,
    height * scaleY,
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob);
    }, 'image/jpeg', 1);
  });
};

const getOffset = (el: HTMLElement) => {
  if (!el) {
    return { top: 0, left: 0 };
  }
  const rect = el.getBoundingClientRect();
  const { clientTop, clientLeft } = document.documentElement;
  const { pageYOffset, pageXOffset } = window;

  const top = rect.top + pageYOffset - clientTop;
  const left = rect.left + pageXOffset - clientLeft;

  return { top, left };
};

interface AppProps { }

interface AppState {
  image: null | File,
  imageUrl: null | string,
  prevImage: null | File,
  prevImageUrl: null | string,
  crop: Rectangle,
  cropState: Status,
}

class App extends React.Component<AppProps, AppState> {
  resizeDir = '';

  mouseStart: Point = { x: 0, y: 0 };

  prevCrop: Rectangle = {
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  };

  parentSize: Rectangle = {
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  }

  constructor(props: AppProps) {
    super(props);
    this.state = {
      image: null,
      imageUrl: null,
      prevImage: null,
      prevImageUrl: null,
      crop: {
        top: 0,
        left: 0,
        bottom: 100,
        right: 100,
      },
      cropState: Status.None,
    };
  }

  componentDidMount() {
    document.addEventListener('mousemove', this.handleMoving);
    document.addEventListener('mouseup', this.handleMouseUp);
    window.addEventListener('resize', this.handleWindowResize);
  }

  componentWillUnmount() {
    document.removeEventListener('mousemove', this.handleMoving);
    document.removeEventListener('mouseup', this.handleMouseUp);
    window.removeEventListener('resize', this.handleWindowResize);
  }

  getCropStyle() {
    const { crop } = this.state;
    const { width, height } = getSize(crop);
    return {
      top: `${crop.top}px`,
      left: `${crop.left}px`,
      width: `${width}px`,
      height: `${height}px`,
    };
  }

  handleWindowResize = () => {
    const { cropState } = this.state;
    const newStatus = cropState === Status.None ? Status.None : Status.Ready;
    this.setState({ cropState: newStatus })
  };

  handleImgInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const reader = new FileReader();
    const { files } = e.target;
    if (files && files.length > 0) {
      const image = files[0];
      reader.onloadend = () => {
        const imageUrl = reader.result as string;
        this.setState({ image, imageUrl, cropState: Status.Ready });
      };
      reader.readAsDataURL(image);
    }
  }

  handleCutClick = () => {
    const { cropState } = this.state;
    if (cropState === Status.None) {
      return;
    }

    const { clientWidth, clientHeight } = document.getElementById('imageOriginal') as HTMLImageElement;

    const crop = {
      top: 0,
      left: 0,
      bottom: clientHeight,
      right: clientWidth,
    };

    this.setState({ crop, cropState: Status.Cropping });
  }

  handleUndoClick = () => {
    const { prevImage, prevImageUrl } = this.state;
    this.setState({
      image: prevImage,
      imageUrl: prevImageUrl,
      prevImage: null,
      prevImageUrl: null,
      cropState: Status.Ready,
    });
  }

  handleOkCutClick = () => {
    const img = document.getElementById('imageOriginal') as HTMLImageElement;
    const { crop } = this.state;

    if (!img || !crop) {
      return;
    }

    getCroppedImg(img, crop)
      .then((blob) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const newImageUrl = reader.result as string;
          const { image, imageUrl } = this.state;
          this.setState({
            image: blob as File,
            imageUrl: newImageUrl,
            prevImage: image,
            prevImageUrl: imageUrl,
            cropState: Status.Ready,
          });
        };
        reader.readAsDataURL(blob as Blob);
      });
  }

  handleCancelCutClick = () => {
    this.setState({ cropState: Status.Ready });
  }

  handleUpload = (e: React.FormEvent<HTMLButtonElement>) => {
    e.preventDefault();
    // TODO: uploading code here
  }

  handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();

    const { cropState } = this.state;

    if (cropState === Status.None) {
      return;
    }

    this.mouseStart = { x: e.pageX, y: e.pageY };

    const img = document.getElementById('imageOriginal');
    if (!img) {
      return;
    }

    const offset = getOffset(img);
    this.parentSize = {
      top: offset.top,
      left: offset.left,
      bottom: img.clientHeight,
      right: img.clientWidth,
    }

    if (e.target === img) {
      this.setState({ cropState: Status.Creating });
      return;
    }

    const div = e.target as HTMLDivElement;
    const rszCorner = div.dataset.ord;
    const { crop } = this.state;
    this.prevCrop = crop;

    if (rszCorner) {
      this.setState({ cropState: Status.Resizing });
      this.resizeDir = rszCorner;
    } else {
      this.setState({ cropState: Status.Moving });
    }
  }

  handleMouseUp = (e: MouseEvent) => {
    e.preventDefault();
    const { cropState } = this.state;
    if (cropState === Status.None || cropState === Status.Ready) {
      return;
    }

    this.setState({ cropState: Status.Cropping });
  }

  handleMoving = (e: MouseEvent) => {
    e.preventDefault();
    const { pageX, pageY } = e;
    const mouseCurrPoint = { x: pageX, y: pageY };
    const { cropState } = this.state;

    switch (cropState) {
      case Status.Creating:
        this.setState({
          crop: getNewCrop(this.mouseStart, mouseCurrPoint, this.parentSize),
        });
        break;
      case Status.Moving:
        this.setState({
          crop: getMovedCrop(this.prevCrop, this.mouseStart, mouseCurrPoint, this.parentSize),
        });
        break;
      case Status.Resizing:
        this.setState({
          crop: getResizedCrop(this.prevCrop, this.resizeDir, this.mouseStart, mouseCurrPoint, this.parentSize),
        });
        break;
      default:
        break;
    }
  }

  renderForm() {
    const { image } = this.state;
    const name = image ? image.name : 'Choose file';

    return (
      <>
        <div className="row">
          <div className="custom-file">
            <label className="custom-file-label" id="file-label" htmlFor="customFile">
              {name}
              <input type="file" className="custom-file-input" id="customFile" onChange={this.handleImgInput} />
            </label>
          </div>
        </div>
      </>
    );
  }

  renderCutUndoButtons() {
    const { cropState, prevImageUrl } = this.state;
    const cutDisabled = cropState === Status.None;

    return (
      <>
        <button
          type="button"
          className="btn btn-primary btn-sm mx-2"
          disabled={cutDisabled}
          id="cutBtn"
          onClick={this.handleCutClick}
        >
            Cut
        </button>
        <button
          type="button"
          className="btn btn-danger btn-sm mx-2"
          disabled={!prevImageUrl}
          id="cutBtn"
          onClick={this.handleUndoClick}
        >
            Undo
        </button>
      </>
    );
  }

  renderOkCancelButtons() {
    return (
      <>
        <button
          type="button"
          className="btn btn-success btn-sm mx-2"
          id="cutOkBtn"
          onClick={this.handleOkCutClick}
        >
            OK
        </button>
        <button
          type="button"
          className="btn btn-danger btn-sm mx-2"
          id="cutCancelBtn"
          onClick={this.handleCancelCutClick}
        >
            Cancel
        </button>
      </>
    )
  }

  renderButtons() {
    const { cropState } = this.state;
    const isReadyToCut = cropState === Status.Ready;
    const isCropping = cropState !== Status.None && cropState !== Status.Ready;

    return (
      <div className="row justify-content-center cut-btns">
        {isReadyToCut && this.renderCutUndoButtons()}
        {isCropping && this.renderOkCancelButtons()}
      </div>
    );
  }

  renderImage() {
    const { imageUrl, cropState } = this.state;

    if (!imageUrl) {
      return null;
    }

    const isCropping = cropState !== Status.None && cropState !== Status.Ready;
    const resizeControls = Object.keys(createCrop);

    return (
      <>
        <div className="row justify-content-center my-3">
          <div role="presentation" className="img-preview " onMouseDown={this.handleMouseDown} id="imgPreview">
            <img src={imageUrl} className="upload-img border border-info" alt="" id="imageOriginal" />
            {isCropping
              && <CropFrame style={this.getCropStyle()} controls={resizeControls} />}
          </div>
        </div>
        <div className="row justify-content-center my-5">
          <button type="button" className="btn btn-primary mb-2" onClick={this.handleUpload}>Upload</button>
        </div>
      </>
    );
  }

  render() {
    return (
      <div className="container">
        {this.renderForm()}
        {this.renderButtons()}
        {this.renderImage()}
      </div>
    );
  }
}

export default App;
