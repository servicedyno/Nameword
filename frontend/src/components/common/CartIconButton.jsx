import CartNavButton from "../checkout/CartNavButton";

// Legacy import path kept for the authed top bars; renders the new cart button.
const CartIconButton = () => <CartNavButton className="xl:inline-flex hidden" />;

export default CartIconButton;
