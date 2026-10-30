/** Account-resolved entry avoids linking credentials to a different coach. */
export const ATHLETE_PANEL_URL = "https://alpha-coach.app/atleta";

export const athletePanelEmailSection = () => `
  <p style="font-size:14px;color:#333;"><strong>Painel do atleta:</strong>
    <a href="${ATHLETE_PANEL_URL}" style="color:#E50914;">${ATHLETE_PANEL_URL}</a><br />
    Acesse com o mesmo e-mail e senha do aplicativo.
  </p>
  <p style="text-align:center;margin:24px 0;">
    <a href="${ATHLETE_PANEL_URL}" style="background:#E50914;color:#fff;padding:14px 28px;text-decoration:none;font-weight:bold;font-size:13px;">ACESSAR PAINEL DO ATLETA</a>
  </p>`;