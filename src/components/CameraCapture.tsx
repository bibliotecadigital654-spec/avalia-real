import { useEffect, useRef, useState } from "react";

type Props = {
  rotulo: string;
  ajuda?: string;
  textoBotao?: string;
  onCapturar: (dataUrl: string) => void;
};

export function CameraCapture({ rotulo, ajuda, textoBotao = "Tirar foto", onCapturar }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ligada, setLigada] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [previa, setPrevia] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function ligar() {
    setErro(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      setLigada(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      });
    } catch {
      setErro("Não foi possível acessar a câmera. Autorize o uso no navegador e tente de novo.");
    }
  }

  function capturar() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
    setPrevia(dataUrl);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setLigada(false);
    onCapturar(dataUrl);
  }

  return (
    <div className="rounded-[16px] bg-background p-3 ring-1 ring-border">
      <p className="text-xs font-semibold text-foreground/70">{rotulo}</p>
      {ajuda ? <p className="mt-1 text-[11px] text-muted-foreground">{ajuda}</p> : null}

      {previa ? (
        <div className="mt-3">
          <img
            src={previa}
            alt="Foto capturada para verificação"
            className="aspect-[4/3] w-full rounded-[12px] object-cover ring-1 ring-border"
          />
          <button
            type="button"
            onClick={() => {
              setPrevia(null);
              void ligar();
            }}
            className="mt-2 w-full rounded-full bg-card py-2.5 text-xs font-semibold text-muted-foreground ring-1 ring-border"
          >
            Tirar outra foto
          </button>
        </div>
      ) : ligada ? (
        <div className="mt-3">
          <video
            ref={videoRef}
            playsInline
            muted
            className="aspect-[4/3] w-full rounded-[12px] bg-card object-cover ring-1 ring-border"
          />
          <button
            type="button"
            onClick={capturar}
            className="mt-2 w-full rounded-full bg-gradient-brand py-3 text-sm font-semibold text-primary-foreground shadow-brand"
          >
            {textoBotao}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={ligar}
          className="mt-3 w-full rounded-full bg-card py-3 text-sm font-semibold text-brand ring-1 ring-border"
        >
          Abrir câmera
        </button>
      )}

      {erro ? <p className="mt-2 text-[11px] font-medium text-destructive">{erro}</p> : null}
    </div>
  );
}
