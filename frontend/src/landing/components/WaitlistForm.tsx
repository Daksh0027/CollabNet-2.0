import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type Ref,
} from "react";
import {
  ButtonV2,
  ButtonV2Size,
  ButtonV2Type,
  InputSizeV2,
  TextInputV2,
} from "@juspay/blend-design-system";
import { ArrowRight, CircleAlert, CircleCheck } from "lucide-react";
import { content } from "../content";
import { EMAIL_PATTERN, useWaitlist } from "../waitlist/context";

type WaitlistFormProps = {
  /** Used to give each form instance a stable, unique input id. */
  idPrefix: string;
  tone?: "hero" | "closing";
  inputRef?: Ref<HTMLInputElement>;
};

const copy = content.primaryAction;

export function WaitlistForm({
  idPrefix,
  tone = "hero",
  inputRef,
}: WaitlistFormProps) {
  const { status, email: joinedEmail, join, reset } = useWaitlist();
  const [email, setEmail] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const localInputRef = useRef<HTMLInputElement | null>(null);
  const successRef = useRef<HTMLDivElement | null>(null);
  const submittedHere = useRef(false);
  const noteId = useId();
  const inputId = `${idPrefix}-email`;

  useEffect(() => {
    if (status === "success" && submittedHere.current) {
      successRef.current?.focus();
    }
  }, [status]);

  const setRefs = (node: HTMLInputElement | null) => {
    localInputRef.current = node;
    if (typeof inputRef === "function") inputRef(node);
    else if (inputRef) inputRef.current = node;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status === "loading") return;
    const value = email.trim();
    const error = !value
      ? copy.emptyError
      : !EMAIL_PATTERN.test(value)
        ? copy.invalidError
        : null;
    setValidationError(error);
    if (error) {
      localInputRef.current?.focus();
      return;
    }
    submittedHere.current = true;
    await join(value);
  };

  if (status === "success") {
    return (
      <div
        ref={successRef}
        className={`waitlist-success waitlist-success--${tone}`}
        role="status"
        tabIndex={-1}
      >
        <CircleCheck className="waitlist-success__icon" aria-hidden="true" />
        <div>
          <p className="waitlist-success__title">{copy.successTitle}</p>
          <p className="waitlist-success__body">
            {copy.successBody}{" "}
            {joinedEmail && (
              <>
                Confirmation goes to <strong>{joinedEmail}</strong>.
              </>
            )}
          </p>
        </div>
      </div>
    );
  }

  const isLoading = status === "loading";

  return (
    <form
      className={`waitlist waitlist--${tone}`}
      noValidate
      onSubmit={handleSubmit}
      aria-busy={isLoading}
      aria-describedby={noteId}
    >
      <div className="waitlist__row">
        <div className="waitlist__field">
          <TextInputV2
            ref={setRefs}
            id={inputId}
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            label={copy.emailLabel}
            placeholder={copy.emailPlaceholder}
            size={InputSizeV2.LG}
            value={email}
            required
            onChange={(e) => {
              setEmail(e.target.value);
              if (validationError) setValidationError(null);
              if (status === "error") reset();
            }}
            error={{
              show: Boolean(validationError),
              message: validationError ?? undefined,
            }}
          />
        </div>
        <div className="waitlist__submit">
          <ButtonV2
            type="submit"
            buttonType={ButtonV2Type.PRIMARY}
            size={ButtonV2Size.LARGE}
            text={copy.label}
            loading={isLoading}
            aria-label={isLoading ? `${copy.label}, sending` : undefined}
            rightSlot={{ slot: <ArrowRight size={16} aria-hidden="true" /> }}
          />
        </div>
      </div>

      <p className="visually-hidden" role="status">
        {isLoading ? "Saving your spot…" : ""}
      </p>
      <div className="waitlist__feedback" role="alert">
        {status === "error" && (
          <p className="feedback feedback--error">
            <CircleAlert size={16} aria-hidden="true" />
            <span>
              <span className="visually-hidden">Error: </span>
              {copy.serverError}
            </span>
          </p>
        )}
      </div>
      <p id={noteId} className="waitlist__note">
        {copy.privacyNote}
      </p>
    </form>
  );
}
