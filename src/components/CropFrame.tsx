import React from 'react';

type CropProps = {
  style: {},
  controls: string[],
};

const Crop = (props: CropProps) => {
  const { style, controls } = props;
  return (
    <div role="presentation" className="crop-selection" style={style}>
      <div className="resize-controls">
        {controls.map((c) => (
          <div key={c} className={`resize-control ord-${c}`} data-ord={c} />
        ))}
      </div>
    </div>
  );
}

export default Crop;
