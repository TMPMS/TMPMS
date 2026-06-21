import React from 'react';
import { useCart } from '../context/CartContext';
import './ProductCard.css';

const ProductCard = ({ product, isFlashSale }) => {
  const { addToCart } = useCart();

  // Mask price format (e.g. xx.x00đ or xxx.000đ)
  const formatMaskedPrice = (price) => {
    if (!price) return '';
    const priceStr = price.toString();
    if (priceStr.length <= 5) return 'xx.x00đ'; // e.g. 79000 -> xx.x00đ
    if (priceStr.length === 6) return 'xxx.000đ'; // e.g. 102000 -> xxx.000đ
    if (priceStr.length >= 7) return 'x.xxx.000đ'; // e.g. 1890000 -> x.xxx.000đ
    return 'xx.xxxđ';
  };

  return (
    <div className="product-card">
      {/* Badges */}
      <div className="product-badges flex flex-col gap-1">
        {product.discount && <span className="badge-discount">-{product.discount}%</span>}
      </div>

      {/* Origin Flag (e.g., Flash sale items) */}
      {product.origin && (
        <div className="absolute top-3 right-3 text-[10px] bg-gray-100 px-2 py-0.5 rounded-full flex items-center gap-1 z-10 text-gray-600 border border-gray-200">
          <span className="w-2 h-2 rounded-full bg-red-600 inline-block"></span>
          {product.origin}
        </div>
      )}

      {/* Image */}
      <div className="product-image">
        <img src={product.image} alt={product.name} />
      </div>

      {/* Info */}
      <div className="product-info">
        <h3 className="product-name" title={product.name}>{product.name}</h3>
        
        <div className="product-price-container">
          <span className="product-price text-primary font-bold">
            {isFlashSale ? formatMaskedPrice(product.price) : product.price.toLocaleString() + 'đ'} 
            {!isFlashSale && <span className="text-sm font-normal text-muted">/{product.unit}</span>}
            {isFlashSale && <span className="text-sm font-normal text-primary"> / Hộp</span>}
          </span>
          {product.oldPrice && (
            <span className="product-old-price text-muted text-sm" style={{ textDecoration: 'line-through' }}>
              {product.oldPrice.toLocaleString()}đ
            </span>
          )}
        </div>
      </div>

      {/* Action Button */}
      {!isFlashSale && (
        <div className="product-action">
          <button className="btn-add-cart" onClick={() => addToCart(product)}>Chọn mua</button>
        </div>
      )}
    </div>
  );
};

export default ProductCard;
