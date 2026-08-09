import { AnimatePresence, motion } from 'framer-motion';
import useCheckout, { etaDate } from '../../hooks/useCheckout';
import { formatINR } from '../../utils/format';
import Button from '../../components/ui/Button/Button';
import CheckoutProgress from '../../components/checkout/CheckoutProgress/CheckoutProgress';
import CheckoutForm from '../../components/checkout/CheckoutForm/CheckoutForm';
import DeliveryOptions from '../../components/checkout/DeliveryOptions/DeliveryOptions';
import PaymentSelector from '../../components/checkout/PaymentSelector/PaymentSelector';
import CouponBox from '../../components/checkout/CouponBox/CouponBox';
import OrderSummary from '../../components/checkout/OrderSummary/OrderSummary';
import OrderReviewModal from '../../components/checkout/OrderReviewModal/OrderReviewModal';
import styles from './CheckoutPage.module.css';

const EASE_OUT = [0.22, 1, 0.36, 1];

const Section = ({ step, children }) => (
  <motion.div
    key={step}
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -8 }}
    transition={{ duration: 0.3, ease: EASE_OUT }}
  >
    {children}
  </motion.div>
);

const InfoRow = ({ label, value }) => (
  <div className={styles.infoRow}>
    <span className={styles.infoLabel}>{label}</span>
    <span className={styles.infoValue}>{value || '—'}</span>
  </div>
);

export default function CheckoutPage() {
  const checkout = useCheckout();
  const {
    items,
    totals,
    values,
    errors,
    touched,
    setField,
    handleBlur,
    canProceed,

    delivery,
    setDelivery,
    deliveryOptions,

    payment,
    setPayment,
    paymentMethods,

    notes,
    setNotes,

    coupon,
    couponInput,
    setCouponInput,
    couponError,
    applyCoupon,
    removeCoupon,

    step,
    nextStep,
    prevStep,

    openReview,
    setOpenReview,
    placeOrder,
    placing,
  } = checkout;

  if (items.length === 0) {
    return (
      <section className={`page ${styles.section}`} aria-labelledby="checkout-title">
        <header className={styles.header}>
          <p className="page-kicker">Checkout</p>
          <h1 id="checkout-title" className="page-title">
            Checkout.
          </h1>
        </header>
        <div className={styles.empty}>
          <p className={styles.emptyText}>Your bag is empty — nothing to check out yet.</p>
          <Button to="/collections" variant="outline" size="lg">
            Shop the collection
          </Button>
        </div>
      </section>
    );
  }

  const deliveryOption = deliveryOptions.find((option) => option.id === delivery);
  const paymentLabel = paymentMethods.find((method) => method.id === payment)?.label || 'Payment';

  const reviewData = {
    shipping: {
      name: `${values.firstName.trim()} ${values.lastName.trim()}`,
      line1: values.address,
      line2: values.apartment,
      city: values.city,
      state: values.state,
      pincode: values.pincode,
      country: values.country,
    },
    delivery: deliveryOption,
    etaDate: etaDate(Date.now(), deliveryOption?.etaDays ?? 6),
    payment,
    paymentLabel,
    totals,
    notes,
  };

  const openReviewModal = () => setOpenReview(true);

  return (
    <section className={`page ${styles.section}`} aria-labelledby="checkout-title">
      <header className={styles.header}>
        <p className="page-kicker">Checkout</p>
        <h1 id="checkout-title" className="page-title">
          Checkout.
        </h1>
      </header>

      <CheckoutProgress step={step} />

      <div className={styles.layout}>
        <div className={styles.main}>
          <div className={styles.stage}>
            <AnimatePresence mode="wait">
              <Section key={step} step={step}>
                {step === 1 && (
                  <>
                    <CheckoutForm
                      values={values}
                      errors={errors}
                      touched={touched}
                      setField={setField}
                      handleBlur={handleBlur}
                    />
                    <div className={styles.subGroup}>
                      <DeliveryOptions
                        options={deliveryOptions}
                        delivery={delivery}
                        onChange={setDelivery}
                        subtotal={totals.subtotal}
                      />
                    </div>
                  </>
                )}

                {step === 2 && (
                  <>
                    <PaymentSelector
                      methods={paymentMethods}
                      payment={payment}
                      onChange={setPayment}
                    />
                    <div className={styles.notes}>
                      <label htmlFor="order-notes" className={styles.notesLabel}>
                        Order note
                      </label>
                      <textarea
                        id="order-notes"
                        className={styles.notesInput}
                        rows={3}
                        placeholder="Anything we should know? (optional)"
                        value={notes}
                        onChange={(event) => setNotes(event.target.value)}
                        maxLength={240}
                      />
                    </div>
                  </>
                )}

                {step === 3 && (
                  <div className={styles.review}>
                    <div className={styles.reviewGroup}>
                      <h3 className={styles.reviewTitle}>Contact</h3>
                      <InfoRow label="Name" value={reviewData.shipping.name} />
                      <InfoRow label="Email" value={values.email} />
                      <InfoRow label="Phone" value={values.phone} />
                    </div>
                    <div className={styles.reviewGroup}>
                      <h3 className={styles.reviewTitle}>Ship to</h3>
                      <InfoRow label="Address" value={[reviewData.shipping.line1, reviewData.shipping.line2].filter(Boolean).join(', ')} />
                      <InfoRow
                        label="City / State"
                        value={`${values.city}${values.state ? `, ${values.state}` : ''}`}
                      />
                      <InfoRow label="Pincode" value={values.pincode} />
                      <InfoRow label="Country" value={values.country} />
                    </div>
                    <div className={styles.reviewGroup}>
                      <h3 className={styles.reviewTitle}>Delivery & payment</h3>
                      <InfoRow label="Method" value={deliveryOption?.label} />
                      <InfoRow label="Order note" value={notes} />
                      <InfoRow label="Payment" value={paymentLabel} />
                    </div>
                  </div>
                )}
              </Section>
            </AnimatePresence>
          </div>

          <div className={styles.footer}>
            {step > 1 ? (
              <button type="button" className={styles.backBtn} onClick={prevStep}>
                ← Back
              </button>
            ) : (
              <span />
            )}

            {step < 3 ? (
              <button type="button" className={styles.continBtn} onClick={nextStep}>
                {step === 2 ? 'Review order' : 'Continue to payment'}
              </button>
            ) : (
              <button type="button" className={styles.continuing} onClick={canProceed ? openReviewModal : undefined}>
                Place order · {formatINR(totals.grandTotal)}
              </button>
            )}
          </div>
        </div>

        <aside className={styles.aside} aria-label="Order summary">
          <OrderSummary
            items={items}
            totals={totals}
            coupon={coupon}
            deliveryLabel={deliveryOption?.label}
          />
          <CouponBox
            coupon={coupon}
            couponInput={couponInput}
            onCouponInput={setCouponInput}
            error={couponError}
            onApply={applyCoupon}
            onRemove={removeCoupon}
          />
        </aside>
      </div>

      <OrderReviewModal
        open={openReview}
        onClose={() => setOpenReview(false)}
        onPlace={placeOrder}
        data={reviewData}
        placing={placing}
      />
    </section>
  );
}