export function Logo({ size = 64 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Trail AC2000"
    >
      <circle cx="50" cy="50" r="44" fill="#0B1410" stroke="#8FD14F" strokeWidth="4" />
      <text
        x="50"
        y="52"
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="system-ui, sans-serif"
        fontWeight="700"
        fontSize="34"
        fill="#F5F7F3"
      >
        AC
      </text>
      <text
        x="50"
        y="74"
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="system-ui, sans-serif"
        fontWeight="700"
        fontSize="13"
        fill="#8FD14F"
        letterSpacing="1"
      >
        2000
      </text>
    </svg>
  );
}
