const api = require('../../utils/api');
const util = require('../../utils/util');

Page({
  data: {
    securityLogoDataUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDY5IiBoZWlnaHQ9Ijc0IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxnIGNsaXAtcGF0aD0idXJsKCNjbGlwMF83MjZfMTQ1NTUxKSI+PHBhdGggZD0iTTM0LjUuMDAyYTU4LjM5NCA1OC4zOTQgMCAwMTIyLjE3NyA0LjE3MiA0MC43NzYgNDAuNzc2IDAgMDExMC4zMzQgNS44OThMNjkgMTEuODIydjEuNDZsLS4wNDkgMy41MjRjMCAuMzQ0IDAgMS4wNDctLjExMyAxLjg4M2E1Ny4xNjIgNTcuMTYyIDAgMDEtLjUyOCA0LjMxMiA3NS4wNTUgNzUuMDU1IDAgMDEtMy41NjQgMTMuODQ0Yy01LjI2OCAxNC42LTE0LjUwNiAyNi4wOTMtMjYuODkzIDMzLjI3MkwzNC41MjQgNzJsLTEuNzA0LS45ODQtMS42MjQtLjkxNGMtMTIuNDItNy4xODgtMjEuNjgyLTE4LjY4Ny0yNi45NS0zMy4yNzNBNzUuODI4IDc1LjgyOCAwIDAxLjY5IDIyLjk4NmE0OS41MzQgNDkuNTM0IDAgMDEtLjY0MS02LjI1TDAgMTEuNzk5bDEuOTg5LTEuNzExQTQwLjc1NyA0MC43NTcgMCAwMTEyLjMzIDQuMTc0IDU4LjI4NCA1OC4yODQgMCAwMTM0LjUuMDAyem0wIDYuNDZhNTEuNDE2IDUxLjQxNiAwIDAwLTE5LjU1NSAzLjY5NiAzNS4yNzUgMzUuMjc1IDAgMDAtOC4yMDcgNC41MTZ2Mi4wNDZhNDYuMjcgNDYuMjcgMCAwMC41NjggNS4yOTcgNjkuMzk4IDY5LjM5OCAwIDAwMy4yNDcgMTIuNjk1YzQuNzQ5IDEzLjE0OCAxMi45ODggMjMuNDM3IDIzLjkyMyAyOS43OCAxMC45ODMtNi4zNzQgMTkuMTY1LTE2LjYwOSAyMy45MjItMjkuNzhhNjkuMzk0IDY5LjM5NCAwIDAwMy4yNDctMTIuNjk1Yy4yMjgtMS40My4zODItMi43MjYuNDgtMy44NjcuMDMyLS40MDYuMDU2LS43NjYuMDcyLTEuMDc4di0yLjM4M2wtMTIuMzMgOC40MDZhMTYuMzg0IDE2LjM4NCAwIDAxMi4yOTcgOC4xMDJ2LjI4Yy0uMDAzIDMuODUtMS4zNjggNy41ODQtMy44NzEgMTAuNTg3LTIuNTAzIDMuMDAyLTUuOTk0IDUuMDk1LTkuODk4IDUuOTMyLTMuOTA1LjgzOC03Ljk4OS4zNy0xMS41OC0xLjMyNC0zLjU5MS0xLjY5NS02LjQ3NS00LjUxNy04LjE3Ny04LjAwMWExNi4zNTUgMTYuMzU1IDAgMDEtMS4xODUtMTEuMTY0Yy45MzUtMy43NDMgMy4xNjctNy4wNjggNi4zMjgtOS40MjcgMy4xNjEtMi4zNTggNy4wNjMtMy42MSAxMS4wNjMtMy41NSAzLjk5OS4wNjEgNy44NTggMS40MzIgMTAuOTQgMy44ODZsOC4zOTMtOC4yNThoLS4xMTRhNTEuMjQ0IDUxLjI0NCAwIDAwLTE4Ljg5Ny0zLjY5NUgzNC41em0xLjEwNCAyNi4zNTJjLS4zMjguMTU1LS43LjItMS4wNTguMTI2YTEuNjM1IDEuNjM1IDAgMDEtLjkxMi0uNTMyIDEuNTI4IDEuNTI4IDAgMDEtLjM3MS0uOTYyIDEuNTIzIDEuNTIzIDAgMDEuMzI4LS45NzZsNy40NzYtNy4zNTFhMTEuMTY3IDExLjE2NyAwIDAwLTcuNDEyLTIuMDU5Yy0yLjY0OS4yMS01LjEyNiAxLjM0Ny02Ljk2MyAzLjE5Ny0xLjgzNiAxLjg1LTIuOTAzIDQuMjgzLTMgNi44NC0uMDk3IDIuNTU2Ljc4MyA1LjA1OCAyLjQ3NSA3LjAzMSAxLjY5MSAxLjk3NCA0LjA3NSAzLjI4MiA2LjcwMiAzLjY3NyAyLjYyNi4zOTUgNS4zMTItLjE1IDcuNTQ4LTEuNTMzIDIuMjM2LTEuMzgzIDMuODY4LTMuNTA3IDQuNTg2LTUuOTdhMTAuMDk1IDEwLjA5NSAwIDAwLS42ODktNy4zOTVsLTguNjg2IDUuODYtLjAyNC4wNDd6IiBmaWxsPSIjZmZmIi8+PHBhdGggb3BhY2l0eT0iLjIiIGQ9Ik0yNDMuNDE0IDEwLjM5OHYzNC43NiIgc3Ryb2tlPSIjZmZmIiBzdHJva2UtbWl0ZXJsaW1pdD0iMTAiLz48cGF0aCBkPSJNODkuOTMgNTguMjQ2bC0uNjAyLS4zODVhNy40NjggNy40NjggMCAwMDEuODYzLTIuNjgybC42ODMuMTM2Yy0uMTI5LjMyMS0uMjkuNjM1LS40NDIuOTMyaDMuNTk3di42MjZoLTIuMzQ0Yy4zMzIuMzgzLjYyOC43OTcuODgzIDEuMjM2bC0uNjI3LjIxN2MtLjMwOS0uNTA5LS42NTUtLjk5NS0xLjAzNS0xLjQ1M2gtLjgwM2E5LjI2NyA5LjI2NyAwIDAxLTEuMTczIDEuMzczem0uNDk4IDEuMTcydi0uNjU4aDkuMTk0djIuNzNoLTQuMTc1djEuNDIxaDQuNjA5YTguNTIgOC41MiAwIDAxLS4yNjUgMi43NzggMS4yNjEgMS4yNjEgMCAwMS0xLjI1My42NTloLTEuNjA2bC0uMTY5LS42NjdoMS42MDZhLjc1NS43NTUgMCAwMC44MDMtLjQ5Yy4xMS0uNTU0LjE1NC0xLjEyLjEyOS0xLjY4NmgtMy45MDN2My41MWgtLjY1di0zLjQ4NmgtLjE2OWMtLjgwMiAxLjI2MS0yLjQwOCAyLjMyOS00LjgxNyAzLjIxMmwtLjM4Ni0uNjM0YzIuMTg0LS43MzkgMy42NjItMS42MDYgNC40MjUtMi41OTRoLTMuNjNsLjU3LTIuNjgxaDQuMDA3di0xLjQxNGgtNC4zMnptLjk0IDIuMDcybC0uMzQ2IDEuNDIxaDMuNzI2VjYxLjQ5aC0zLjM4em00LjA2My0zLjIxMmwtLjYwMy0uMzg1YTcuNTk1IDcuNTk1IDAgMDAxLjY1NC0yLjY5OGwuNjU5LjEzNmMtLjExMy4zMTMtLjIzMy42MTgtLjM2Mi45aDMuOTM1di42MzRoLTIuNTNjLjMzLjM5OC42MjUuODIyLjg4NCAxLjI2OWwtLjYyNi4yMzJhMTEuNjQ0IDExLjY0NCAwIDAwLTEuMDA0LTEuNTAxaC0uOTg4Yy0uMjkyLjUtLjYzNy45NjktMS4wMjggMS4zOTdsLjAwOS4wMTZ6bTMuNDg0IDIuNTg2di0xLjQ0NmgtMy40Njh2MS40M2wzLjQ2OC4wMTZ6TTEyNi45NTUgNjAuNzAzdi42OWgtMTEuNTA3di0uNjloMTEuNTA3ek0xNTIuMTE5IDU2LjAyMmEyNS41NjggMjUuNTY4IDAgMDEtNC4xMjcuNzIydjIuNDFoNC4yMDd2LjY5OGgtNC4yMDd2Mi4zMTJoNS4xNzl2LjY4M2gtNS4xNzl2Mi45OTVhLjk2Ni45NjYgMCAwMS0xLjA1MiAxLjA2OGgtMS45OTFsLS4xNTMtLjY2N2MuNjUxIDAgMS4yODUuMDQ4IDEuODk1LjA0OGEuNTY5LjU2OSAwIDAwLjY0My0uNjQydi0yLjgxaC01LjYyMXYtLjY4M2g1LjYyMXYtMi4zMTJoLTQuNTYxdi0uNjk5aDQuNTYxdi0yLjMzN2E1OC4yNDIgNTguMjQyIDAgMDEtNC42MDEuMTc3bC0uMjI1LS42MjZjMy4xMS4wNCA2LjIxNC0uMjggOS4yNS0uOTU2bC4zNjEuNjE5ek0xNzguNTYgNTguOTkzYy0uMzE1IDEuNzktLjkgMy41MjMtMS43MzQgNS4xMzkuMDg0LjI3My4xODMuNTQuMjk3LjgwMy4zNTMuODAzLjY3NCAxLjE1Ni45ODcgMS4xNzIuMzE0LjAxNi40OTgtLjgwMy43NTUtMi4yODhsLjYzNC40MDFhMTIuOTM3IDEyLjkzNyAwIDAxLS41MzggMS44MDdjLS4yMzIuNTg2LS41MDUuODc1LS44MDIuODc1LS40NSAwLS45LS40MS0xLjM0OS0xLjIyYTUuMzE4IDUuMzE4IDAgMDEtLjM4Ni0uODAzIDcuMjI1IDcuMjI1IDAgMDEtMS44NzEgMS45NDNsLS4zNjktLjU3YTYuNTEzIDYuNTEzIDAgMDAxLjk1MS0yLjE2OCAyMy45OTcgMjMuOTk3IDAgMDEtLjQ4Mi0xLjk1MiAyOC42MzcgMjguNjM3IDAgMDEtLjQ0MS00LjQ4OGgtNS43NDF2Mi44MjZjLjA0NSAyLjIwNi0uMzA5IDQuNC0xLjA0NCA2LjQ4bC0uNTc4LS41MTRhMTUuODMzIDE1LjgzMyAwIDAwLjk2My01Ljk2NnYtMy41NDloNi4zNzZ2LTEuNjA2aC42NTh2MS42MDZoMS43NWE5LjA1IDkuMDUgMCAwMC0uNjM0LTEuMjg0bC42NTktLjA5N2MuMjMuNDQ3LjQzMi45MDguNjAyIDEuMzgxaC44OTl2LjY1OWgtMy4yNzZjLjAyOSAxLjM0NS4xNSAyLjY4Ni4zNjEgNC4wMTQuMDg3LjU2My4yMDIgMS4xMi4zNDYgMS42N2ExOC40ODggMTguNDg4IDAgMDAxLjM4OS00LjQ5NmwuNjE4LjIyNXptLTguMzM1LjYzNHYtLjYxaDQuMDk1di42MWgtMS43NjZhMjUuODI0IDI1LjgyNCAwIDAxLS40MzQgMS42MDZoMi4yMDh2LjU0NmE3LjQyNiA3LjQyNiAwIDAxLTEuMSAyLjYxYy40MS4yNTcuODAzLjUzIDEuMTg5LjgwM2wtLjM1NC41MjJhMTIuNjk4IDEyLjY5OCAwIDAwLTEuMjItLjgwMyA3LjQwNyA3LjQwNyAwIDAxLTIuNjc0IDEuOTY3bC0uMzUzLS41ODZhNi45NDMgNi45NDMgMCAwMDIuNDU3LTEuNzI3IDQxLjY5NCA0MS42OTQgMCAwMC0xLjczNC0uOTM5Yy4yNTYtLjYxLjQ4OS0xLjIyLjY5OC0xLjc4M2gtMS4wODR2LS42MDJoMS4yODVjLjE4NS0uNTcuMzQ1LTEuMDkyLjQ3NC0xLjYwNmwtMS42ODctLjAwOHptMy40NzcgMi4yaC0xLjc5Yy0uMTc3LjUzLS4zNyAxLjAyOC0uNTc5IDEuNTE4LjQ2Ni4yMTcuOS40NSAxLjM0MS43MDcuNDY0LS42OC44MTEtMS40MzEgMS4wMjgtMi4yMjV6TTE5NC40NzQgNjcuMDE0bC0uNTU0LS40OTdjLjYxMy0xLjUwMy45MTEtMy4xMTUuODc1LTQuNzM4di01LjkxOGgzLjIxMnYxMC4wN2MwIC42NzQtLjI5NyAxLjAwMy0uODU5IDEuMDAzaC0uOWwtLjE5Mi0uNjVoLjg3NWMuMjgxIDAgLjQyNi0uMjA5LjQyNi0uNjE5di0yLjk3aC0xLjkxOWExMS43MTUgMTEuNzE1IDAgMDEtLjk2NCA0LjMyem0yLjg0Mi0xMC40MzhoLTEuODU0djIuNDU3aDEuODU0di0yLjQ1N3ptLTEuODU0IDUuNTA4aDEuODU0di0yLjQwOWgtMS44NTR2Mi40MXptNi4xNTgtNi43Mjh2Mi4xNmgyLjQwOWMwIDQuMjA3LS4wNjQgNi44LS4xOTMgNy44MDRhMS42ODkgMS42ODkgMCAwMS0uNjA4IDEuMjMgMS42OSAxLjY5IDAgMDEtMS4zMTkuMzc2aC0uOTYzbC0uMTY5LS42NjZoMS4wNDRhMS4yNSAxLjI1IDAgMDAxLjMyNS0xLjIyYy4wOTYtLjgwNC4xNDQtMy4wODQuMTY4LTYuODgyaC0xLjY5NHYuODAzYzAgMy42NjEtLjkyMyA2LjMzNS0yLjY3NCA4LjAzbC0uNTU0LS40NzRjMS42ODctMS41NjYgMi41My00LjA4NyAyLjU2Mi03LjU1NnYtLjgwM2gtMi4yNjV2LS42NzVoMi4yNjV2LTIuMTY4bC42NjYuMDR6bS0xLjg2MyA0LjgxN2ExMi45OSAxMi45OSAwIDAxLS43MDYgMy40MmwtLjYxOC0uMTkyYy40MTctMS4wNTguNjY5LTIuMTc0Ljc0Ni0zLjMwOGwuNTc4LjA4em01Ljk3NCAzLjA2OGwtLjUzOC4yNDhhMzUuNjIgMzUuNjIgMCAwMC0uODkxLTMuMjkybC41MDYtLjE3NmMuMzY4IDEuMDMuNjc2IDIuMDgxLjkyMyAzLjE0N3YuMDczek0yMjEuMTQxIDU3LjgxMmExOC45NTcgMTguOTU3IDAgMDEtLjQxOCAzLjY5NGwtLjU1NC0uMTY5Yy4yNDgtMS4xNzYuMzktMi4zNzIuNDI2LTMuNTczbC41NDYuMDQ4em0xLjQ4NS0yLjQwOXYxMS41NjNoLS42OTlWNTUuMzQ3bC42OTkuMDU2em01Ljg0NS0uMDU2di44NmgzLjA4NHYuNTg1aC0zLjA4NHYxLjAyaDIuNjV2LjU3OGgtMi42NXYxLjAyOGgzLjQ0NXYuNjAyaC03LjYzNnYtLjEzNmwtLjUxNC4xMjhjLS4yLS44MDUtLjQ2OC0xLjU5Mi0uODAzLTIuMzUybC41MDYtLjE4NWMuMzI1Ljc0Ny41OTQgMS41MTcuODAzIDIuMzA0di0uMzZoMy40OTNWNTguMzloLTIuNjgydi0uNTc4aDIuNjgydi0xLjA0NGgtMy4xMjR2LS41NjJoMy4xMjR2LS45MTVsLjcwNi4wNTZ6bS0yLjU0NSAxMS43aC0uNjY2di02LjAyM2g1LjYydjUuMDAyYS44LjggMCAwMS0uOTIzLjk0OGgtMS4wMzZsLS4xODUtLjYyNmguOTk2YS40MzQuNDM0IDAgMDAuNDktLjQ5di0uOTY0aC00LjI5NnYyLjE1MnptNC4yOTYtNS40MTNoLTQuMjk2djEuMDc2aDQuMjk2di0xLjA3NnptLTQuMjk2IDIuNzQ2aDQuMjk2di0xLjExNmgtNC4yOTZ2MS4xMTZ6TTI1MC43NjkgNjEuMjczYy0uNTEzLjI1LTEuMDQzLjQ5OC0xLjU2NS43MTV2My45NDJhLjkwOC45MDggMCAwMS0uMDM1LjQxNy45MDcuOTA3IDAgMDEtLjU2OS41ODMuOTE0LjkxNCAwIDAxLS40MTYuMDQ0aC0xLjE4bC0uMTUzLS42NjZjLjM4NSAwIC43NDcuMDQ4IDEuMDc2LjA0OGEuNTMzLjUzMyAwIDAwLjU3My0uMzYuNTIzLjUyMyAwIDAwLjAyMS0uMjQyVjYyLjI2Yy0uNjQyLjI0LTEuMzAxLjQ1OC0xLjk0My42NWwtLjE3Ny0uNjc0YTE5LjY4NSAxOS42ODUgMCAwMDIuMTItLjY1di0zLjIxMmgtMS45NDN2LS42NWgxLjk0M3YtMi40MWguNjgzdjIuNDFoMS41MjV2LjY1aC0xLjUyNXYyLjkyMmEyMS4zMTIgMjEuMzEyIDAgMDAxLjU2NS0uNzQ2di43MjJ6bTEuNDk0IDUuNzU4aC0uNjY3VjU1Ljg4NWg1LjQ0NGMuMDQzLjkxLS4wMyAxLjgyMy0uMjE2IDIuNzE1LS4xNDUuNDU3LS42MDMuNjktMS4zODkuNjloLS45bC0uMTkyLS42MDJoLjgwM2MuMjQyLjAwNS40ODQtLjAxNi43MjItLjA2NGEuNjQuNjQgMCAwMC4zNDUtLjMyMiA2LjEwMiA2LjEwMiAwIDAwLjE5My0xLjc3NGgtNC4xMTF2My45NThoNC44OTh2LjYwM2E5LjAzNCA5LjAzNCAwIDAxLTEuNDQ1IDMuNTczIDExLjMxMyAxMS4zMTMgMCAwMDIuNDA5IDEuNzc0bC0uNDY2LjUzOGExMi4wNDggMTIuMDQ4IDAgMDEtMi4zNTMtMS43OTggNy40OTggNy40OTggMCAwMS0yLjM1MiAxLjgzOGwtLjM0Ni0uNjAyYTcuMjExIDcuMjExIDAgMDAyLjIyNC0xLjc1IDcuMDEyIDcuMDEyIDAgMDEtMS42NzgtMy41MzNoLS45MDdsLS4wMTYgNS45MDJ6bTIuOTcxLTIuODgzYTguNTQ4IDguNTQ4IDAgMDAxLjI2OC0zLjAyaC0yLjcxM2E2LjIwOCA2LjIwOCAwIDAwMS40NDUgMy4wMnpNMjc0Ljk3IDY0Ljc5Yy4xNDcuMjQxLjIxOS41Mi4yMDkuODAzLjAxLjQ4LS4xNDkuOTUtLjQ1IDEuMzI1LS4zMDEuMzY0LS43MTMuNjItMS4xNzIuNzN2LS41MjFhMS4zNiAxLjM2IDAgMDAuODAzLS41MzggMS4yNSAxLjI1IDAgMDAuMjU3LS44MDMuOS45IDAgMDEtLjI1NyAwIC42NS42NSAwIDAxLS42MDItLjM5OC42NDQuNjQ0IDAgMDEtLjA0OS0uMjUzLjYyNS42MjUgMCAwMS4xNzctLjQ5LjY4NS42ODUgMCAwMS41MTQtLjE3Ni43LjcgMCAwMS41Ny4zMjF6TTMxMC40MTMgNjAuNzAzdi42OWgtMTEuNTA3di0uNjloMTEuNTA3ek0zMzAuMDEzIDY1LjA0YTQwLjUyNiA0MC41MjYgMCAwMS00Ljc0NSAxLjFsLS4xNjEtLjY2N2MuOTcyLS4xNTMgMS45MjctLjMzIDIuODI3LS41MzguNDM5LTEuOTYuNzQ4LTMuOTQ5LjkyMy01Ljk1bC42ODMuMDg4YTQ0LjIwMyA0NC4yMDMgMCAwMS0uOTQgNS42OTNjLjQ3NC0uMTI4Ljk0OC0uMjY1IDEuNDEzLS40MXYuNjgzem0tMi42MzMtNy41MDlhMjYuOTQyIDI2Ljk0MiAwIDAwLS41NzgtMi4wMTVsLjcwNi0uMTJjLjE3Ny42MTguMzcgMS4zNC41NTQgMi4xMzZoMi4xMjh2LjY2NmgtNC45OTR2LS42NjZoMi4xODR6bS0uMjgxIDYuNzg1bC0uNTk0LjE1M2E2My4yNjUgNjMuMjY1IDAgMDAtLjg4NC01LjE0N2wuNjAzLS4yMDljLjMyMSAxLjUwMi42MTggMy4yMzYuODc1IDUuMTg3di4wMTZ6bTYuMTgyLTkuMDE3djIuMzM3aDMuMzI1di42OWgtMy4zMjV2Mi42OThoMi42MXY1LjkyNmgtLjY3NHYtLjg4M2gtMy44NTV2LjloLS42NTh2LTUuOTQzaDEuODc5di01Ljc0bC42OTguMDE1em0xLjkzNiAxMC4xMXYtMy43NjZoLTMuODU1djMuNzVsMy44NTUuMDE1ek0zNTcuMDk2IDYwLjY4N3YuNjc1aC0yLjMzNnYzLjYwNWE0My40OCA0My40OCAwIDAwMi44NS0uNjI2di42OThjLTEuOTY3LjQ4LTMuOTU5Ljg1NS01Ljk2NiAxLjEyNGwtLjE2OC0uNjY2YTM4LjUyNiAzOC41MjYgMCAwMDIuNTg1LS4zOTR2LTMuNzQxaC0yLjM2OHYtLjY3NWg1LjQwM3ptLjgwMy0zLjAxOWEzMi4xMDkgMzIuMTA5IDAgMDEtLjA2NC0yLjM1M2guNzE1YzAgLjgwMyAwIDEuNjA2LjA2NCAyLjM1M2g0LjAxNXYuNjk5aC00LjAxNWEyMC40MzkgMjAuNDM5IDAgMDAxLjA2OCA1LjdjLjU1NCAxLjQyMiAxLjA2OCAyLjEyIDEuNTI2IDIuMTUzLjMxMy0uMDY1LjYxOC0uODAzLjg5OS0yLjMxM2wuNjM0LjMyMWMtLjM4NSAxLjgyMy0uODc1IDIuNzM4LTEuNDkzIDIuNzQ2LTEuMDUyLS4wNDgtMS45NzYtMS40NjEtMi43NDYtNC4yNTVhMjQuNjYzIDI0LjY2MyAwIDAxLS42MTEtNC4zNTJoLTYuNDIzdi0uNjk5aDYuNDMxem0zLjgzOS0uNTU0bC0uNTg3LjI5N2ExMy45OTMgMTMuOTkzIDAgMDAtMS4yNTItMS43MThsLjYyNi0uMjljLjQ0OC41NC44NTYgMS4xMTIgMS4yMjEgMS43MTFoLS4wMDh6TTM4MS4yOTcgNjAuMjIyYy40MDktLjczMS44MDMtMS40NjIgMS4xNzItMi4xODRsLjcwNy4yMTZjLS4zODYuNzIzLS43MzEgMS4zODEtMS4wNTIgMS45NjhoNi44MDl2LjY2NmgtMi41N2ExMC41OTQgMTAuNTk0IDAgMDEtMS45MTkgMy4zNDggNDcuODQgNDcuODQgMCAwMTQuMTQzIDIuMDk2bC0uNDY1LjU5NGE0MC44MTcgNDAuODE3IDAgMDAtNC4xOTItMi4xNiA4LjY2MyA4LjY2MyAwIDAxLTUuNzQxIDIuMDhsLS40MDktLjY1OWE4LjUyOSA4LjUyOSAwIDAwNS40Ni0xLjY5NCAzMy44MDMgMzMuODAzIDAgMDAtMy42ODYtMS4zODljLjQ3NC0uNzQ3LjkyNC0xLjQ3NyAxLjM0OS0yLjIxNmgtMy4yMTJ2LS42NjZoMy42MDZ6bTcuMjI2LS45NDhoLS42OThWNTcuM2gtOS4wNTh2MS45NTFoLS42OTh2LTIuNjM0aDQuOTM4Yy0uMTc2LS40NC0uMzgtLjg3LS42MS0xLjI4NGwuODAzLS4xMjljLjIyNS40Ni40MjYuOTMyLjYwMiAxLjQxM2g0Ljc0NWwtLjAyNCAyLjY1OHptLTcuOTQ5IDMuNTE3YzEuMDkyLjM0IDIuMTY0Ljc0IDMuMjEyIDEuMTk2YTguODQ5IDguODQ5IDAgMDAxLjgzOS0zLjA5OWgtMy44NzljLS40NDkuNzE1LS44MzUgMS4zNTctMS4xOTYgMS44OTVsLjAyNC4wMDh6TTQwOS43NDUgNTUuNDAzYTE4LjQ2IDE4LjQ2IDAgMDA1LjYyIDQuMDcxbC0uMzQ1LjYwM2ExOC4yNzQgMTguMjc0IDAgMDEtNS41MzItNC4wMTUgMTguMjYzIDE4LjI2MyAwIDAxLTUuNTczIDQuMTI3bC0uMzM3LS42MThhMTguODA4IDE4LjgwOCAwIDAwNS42NzctNC4xNjhoLjQ5em0zLjM0OCA0LjA5NXYuNjgzaC0zLjIxMnYyLjQ0OWgzLjgxNHYuNjgyaC0zLjgxNHYyLjY0Mmg0Ljk4N3YuNjlINDA0LjE4di0uNjgyaDQuOTcxdi0yLjY3NGgtMy44M3YtLjY1OGgzLjgzdi0yLjQ4MWgtMy4yMTJ2LS42ODNsNy4xNTQuMDMyek00MzAuNjMyIDY3LjAzOGwtLjUzOC0uNDc0Yy41NjItMS40NTkuODM1LTMuMDEzLjgwMy00LjU3NnYtNi4wNzloMy41NzNWNjUuOTNjMCAuNjk5LS4zMzcgMS4wNi0xLjAwNCAxLjA2aC0xLjAyOGwtLjE2OC0uNjE4aC45ODdjLjM2MiAwIC41NTQtLjIzMy41NTQtLjY5di0zLjEyNGgtMi4zMDRhMTIuMjgyIDEyLjI4MiAwIDAxLS44NzUgNC40OHptMy4yMTItMTAuNDM4aC0yLjI4OXYyLjM2aDIuMjg5VjU2LjZ6bS0yLjI4OSA1LjMzMWgyLjI4OXYtMi4zNjhoLTIuMjg5djIuMzY4em00LjgxOCA1LjEzMWgtLjY1OVY1NS45MWg1LjA2N2ExMi43MTkgMTIuNzE5IDAgMDEtLjIzMyAzLjAzNWMtLjE0NC41MTQtLjYxOC44MDMtMS40MzcuODAzaC0uOTk2bC0uMTkyLS42MDJoLjg2N2MuMjQ4LjAwNy40OTctLjAyLjczOC0uMDhhLjYxNS42MTUgMCAwMC4zNzgtLjM4NiA4Ljc3NyA4Ljc3NyAwIDAwLjE3Ni0yLjA5NWgtMy43MDl2NC4xMDNoNC40MDh2LjU4NmE5LjQ0MyA5LjQ0MyAwIDAxLTEuMzY1IDMuNTA5Yy42Ni42MzIgMS40MDMgMS4xNzIgMi4yMDggMS42MDZsLS4zMjkuNTc4YTEwLjE5OCAxMC4xOTggMCAwMS0yLjI2NC0xLjY5NCA2LjkzNSA2LjkzNSAwIDAxLTIuMDggMS43MWwtLjM2MS0uNTU0YTYuOTA0IDYuOTA0IDAgMDAxLjk3NS0xLjYwNiA4LjMwOCA4LjMwOCAwIDAxLTEuNzY3LTMuNTA5aC0uNDI1djUuNzV6bTIuNTQ1LTIuODI2Yy41ODEtLjkxLjk4Ni0xLjkyIDEuMTk3LTIuOThoLTIuNzQ3YTcuMzc1IDcuMzc1IDAgMDAxLjU1IDIuOTh6TTQ2MC43NDkgNTUuMzU1YTkuMDczIDkuMDczIDAgMDEtLjU1NCAxLjA2OGg1LjY5M3YuNTg3YTExLjE5OCAxMS4xOTggMCAwMS0zLjE2NCAyLjUyIDE2LjY2MiAxNi42NjIgMCAwMDUuMDQzIDEuMzFsLS4zMTQuNjU4YTE2LjI2NSAxNi4yNjUgMCAwMS01LjQ4NC0xLjYwNiAyMS4zNzkgMjEuMzc5IDAgMDEtNS42MiAxLjYwNmwtLjMyMi0uNjQyYTIwLjQgMjAuNCAwIDAwNS4xNjMtMS4zNSAxNC45MDYgMTQuOTA2IDAgMDEtMi4yMzItMS42MDVjLS41MzIuNDg3LTEuMTEzLjkxOC0xLjczNCAxLjI4NGwtLjM0Ni0uNTdhNy4xMDMgNy4xMDMgMCAwMDMuMjEyLTMuMzQ4bC42NTkuMDg4em0xLjIyIDUuNTY1YTguNzM3IDguNzM3IDAgMDEtLjE0NCAxLjYwNmg0LjU3NmMwIDIuMTAzLS4yMTYgMy4zNzItLjU5NCAzLjc5YTIuNTUzIDIuNTUzIDAgMDEtMS45NTEuNjI2aC0xLjQxM2wtLjE4NS0uNjQyYy41ODYgMCAxLjA2LjA1NiAxLjQ0Ni4wNTYuODAzIDAgMS4zODktLjE4NSAxLjYwNS0uNTE0LjMwNS0uODQ5LjQzOC0xLjc1LjM5NC0yLjY1aC00LjAxNWE2LjE5OSA2LjE5OSAwIDAxLS40NSAxLjA1MmMtLjY4MiAxLjE1Ni0yLjE4NCAyLjExMi00LjUyOCAyLjg1OWwtLjQ1OC0uNTU0YzIuMTA0LS42MzUgMy41MTctMS40NDYgNC4yNC0yLjQxLjE3Ny0uMjk5LjMyNy0uNjEzLjQ0OS0uOTM5aC0zLjk3NHYtLjYyNmg0LjE2N2MuMTEzLS41MjguMTctMS4wNjYuMTY5LTEuNjA2bC42NjYtLjA0OHptMi45MzktMy44MzhoLTUuMTc5YTIuMTggMi4xOCAwIDAwLS4yNTcuMzA1IDExLjQ4NyAxMS40ODcgMCAwMDIuNTEzIDEuNzU4IDExLjg0IDExLjg0IDAgMDAyLjkyMy0yLjA2M3oiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iLjgiLz48cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZD0iTTQxOC4wMTYgOS41NzFoLTQuMDE0djYuNzYxaC0xMi45Njh2MTcuNDY0aDMuODk0di0xLjk3NWg5LjA1djExLjY5MWg0LjAxNHYtMTEuNjloOS4wNXYxLjgzaDMuOTAydi0xNy4zMmgtMTIuOTI4di02Ljc2em0tNC4wMTQgMTguNTg5aC05LjA3NHYtOC4xNjZoOS4wNWwuMDI0IDguMTY2em0xMy4wODgtOC4xNjZ2OC4xNjZoLTkuMDc0di04LjE2Nmg5LjA3NHpNNDMzLjg5OSAzMy42NTJjLjM2My4xNjQuNzM2LjMwNiAxLjExNi40MjUuODY4LjIzNyAxLjcwOS41NjggMi41MDUuOTg4YTI0OS42MzMgMjQ5LjYzMyAwIDAwMy4zNzMtMTEuNjU5bC41MjktMi4wMDctMy43NjUtMS4xMjRhMTM1LjM1MiAxMzUuMzUyIDAgMDEtMy43NTggMTMuMzc3ek00NjIuMTg3IDE5Ljk3bC0uMjk3LS41MzgtMy4zNDEgMS44M2EzNzQuNjU3IDM3NC42NTcgMCAwMTUuODQ2IDExLjU0N2wzLjYyMS0xLjk3NmE1NjIuMzAyIDU2Mi4zMDIgMCAwMC01LjgyOS0xMC44NjN6TTQ1Ny4zOTMgMzcuNDM0di4xMjhhLjY5LjY5IDAgMDEtLjY3NC41N2gtOS4wMzRhLjY4My42ODMgMCAwMS0uNTYyLS42ODJWMTcuNjY1aC00LjExMXYyMC4wNzRhNC44MiA0LjgyIDAgMDA0LjgxOCA0LjU5M2g5LjE2MmE0LjgxOSA0LjgxOSAwIDAwNC41MzYtNC44MTh2LTUuNDUyaC00LjExMWwtLjAyNCA1LjM3MnpNNDQ4LjkzOCA5LjU3MWwtMi42NSAyLjY3NGMzLjUzMyAzLjQ3NCA2LjEzNSA2LjE5NiA3LjgwNSA4LjE2NmwyLjc4Ni0zLjA5MWExMDAuMTAyIDEwMC4xMDIgMCAwMC03LjIyNi03LjE0NmwtLjcxNS0uNjAzek0zNTMuNTM5IDIwLjczMmg4LjAwNnYtMy4zNTZoLTguMDA2di0xLjEyNGg5LjA3NHYtMy4zNjRoLTkuMDc0di0yLjUyMmgtMy43NDF2Mi41MjFoLTguNTQ0djMuMzY1aDguNTQ0djEuMTI0aC03LjIwM3YzLjM1Nmg3LjIwM3YxLjEzM2gtOS4zNDd2My4zNTZoMjIuN3YtMy4zNTdoLTkuNjEydi0xLjEzMnpNMzQ1LjM2NSAyNi4xNzZoLTMuMzA4djE3LjI3MmgzLjMwOHYtNS4xOTVoMTIuNDg2di4yMTZhMS41NDggMS41NDggMCAwMS0xLjU0MSAxLjU0MmgtNC41MDV2My4yOTJoNC41MDVhNC44MTcgNC44MTcgMCAwMDQuODE3LTQuODE3VjI2LjIwOGgtMTUuNzYydi0uMDMyem0wIDkuMTM4di0xLjE0aDEyLjQ4NnYxLjE1NmwtMTIuNDg2LS4wMTZ6bTEyLjQ4Ni01LjgxNHYxLjc0M2gtMTIuNDg2VjI5LjVoMTIuNDg2eiIgZmlsbD0iI2ZmZiIvPjxwYXRoIGQ9Ik0zMzAuNzA4IDE3LjE4M2wtMS41NDcgMTAuMTA0IDMuMjU1LjQ5OCAxLjU0Ni0xMC4xMDQtMy4yNTQtLjQ5OHoiIGZpbGw9IiNmZmYiLz48cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZD0iTTM0MS41OTkgMTguODUzbC0zLjI3Ni0yLjIzMnYtNi4yNTVoLTMuNzQxdjMzLjA4MmgzLjc0MVYyMC44MDVsMS4zMzMuOTA3IDEuOTQzLTIuODU5eiIgZmlsbD0iI2ZmZiIvPjxwYXRoIGQ9Ik0yNzYuNDcyIDE5LjgyNUgyNjQuOTl2My4zOGgxMS40ODJ2LTMuMzh6IiBmaWxsPSIjZmZmIi8+PHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0yODYuNzU4IDM5LjE1MmE3Ljc3NCA3Ljc3NCAwIDAxLTMuMDQzLTMuMjEyIDUyLjIwMyA1Mi4yMDMgMCAwMDYuMjYzLTEzLjkzMWwtMy4zMjQtMS4wMmE1My43MyA1My43MyAwIDAxLTQuMTY4IDEwLjI0NmMtLjM2OS0zLjE0LS43MTQtNy4zNjMtMS4wMi0xMi42MzloOC43NDV2LTQuMDc5aC0xLjk1MmwtMi43NTQtNC4wMTQtMi4zMTIgMS42NDYgMS42MDYgMi4zNTJoLTMuNTczYy0uMDY1LTEuMzI0LS4xMjktMi42OS0uMTkzLTQuMTI3bC0zLjQ1My4xNTNjLjA1NiAxLjM4LjEyMSAyLjY5OC4xODUgMy45NzRoLTE4LjA1djIuMDY0Yy4xNDQgMTYuMzA4LTEuNDYyIDIyLjQyNi0yLjg0MyAyNC42OTlsMy4yMTIgMS45MjdjMi4yOC0zLjc1OCAzLjM4OC0xMS44MiAzLjM4OC0yNC42MWgxNC41OThjLjM1MyA2LjA4Ni43NDcgMTAuODYzIDEuMTg4IDE0LjE5Ni4xMy45MDYuMzM0IDEuOC42MTEgMi42NzNhMjMuMzggMjMuMzggMCAwMS00LjY5IDQuODE4bDIuMDY0IDIuNzdhMjUuODYxIDI1Ljg2MSAwIDAwNC4yOTYtNC4xMTkgMTEuODQxIDExLjg0MSAwIDAwNi4wNzggNC4zNzZsMS45NDMuNjUgMS41MzQtOS45MjQtMy40MTMtLjUzLS45MjMgNS42NjF6IiBmaWxsPSIjZmZmIi8+PHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0yNzYuNTc2IDM3LjE2bC0yLjQwOC0xLjMyNGEyNi41NjYgMjYuNTY2IDAgMDAyLjc4Ni00Ljg1OHYtNC42MDloLTUuODYybC42MjctMS41NTgtMi45NjMtMS4xOC0xLjEgMi43MzhoLTMuNTU3djMuMzRoMi4yNGwtMS43OTEgNC40ODkgNC40ODEgMi40OGExMy4wODQgMTMuMDg0IDAgMDEtNS4zMzIgMi43OGwuODAzIDMuMjFhMTYuMzc0IDE2LjM3NCAwIDAwNy41NDgtNC4zMDNsMi45NzEgMS42MDYgMS41NTctMi44MXptLTYuNzg0LTcuNDVoNC4xNjdhMjIuMTUgMjIuMTUgMCAwMS0yLjY2NiA0LjU2OGwtMi43MjItMS41MSAxLjIyMS0zLjA1OXpNMjk1LjkyOCAzNS4yMzRjMCAxLjE5Ni0uODAzIDMuODA2LTEuMTE2IDQuOTYybC0uNTA2IDEuODU1IDMuMjExLjg3NS41MjItMS45MTFzMS4yMjEtNC4zMTIgMS4yMjEtNS43ODF2LTMuMjEyaDIuNjV2Ny45MTdoLTEuMjUzdjIuOTM5aDEuNjYyYTIuODk2IDIuODk2IDAgMDAyLjg2Ny0yLjY2NnYtMjkuM2gtOS4yNTh2MjQuMzIyem01Ljk4Mi03LjAwMmgtMi42OThWMjMuMzVoMi42OTh2NC44ODJ6bTAtOC42NjRoLTIuNjk4di00Ljg3NGgyLjY5OHY0Ljg3NHpNMzIzLjU4OSAxNS4zMzZoLTcuMTQ2Yy4wNC0xLjU0MS4wNjQtMy4yMTEuMDk2LTQuOTM4bC0zLjcwOS0uMDU2Yy0uMDMyIDEuNzcyLS4wNjQgMy40MzctLjA5NyA0Ljk5NGgtNS4yMDN2My42OTRoNS4xMzFjLS4xNjggNC44MTgtLjM5MyA4LjMyNy0uNjk4IDEwLjQzOC0uNjQzIDQuNTMtNC41NjEgOS45MzMtNS45MTggMTEuMzk0bDIuNzA2IDIuNDk3YzEuMjQ0LTEuMzMyIDYuMDQ2LTcuNTIzIDYuODgxLTEzLjM5My4zMjEtMi4yNzIuNTYyLTUuODkzLjczMS0xMC45NTJoMy41NDl2MTguODIxYTEuMzQgMS4zNCAwIDAxLTEuMzQxIDEuMzQxaC00LjY5N3YzLjY5NGg0LjY5N2E1LjA0MiA1LjA0MiAwIDAwNS4wMTgtNS4wMzV2LTguNjRsMi4zNDUgMi40MSAyLjM2OS0yLjI5LTQuNzE0LTQuODczdi05LjEwNnoiIGZpbGw9IiNmZmYiLz48cGF0aCBkPSJNMzA4LjI0MiAyMy40NTVsLTIuMzk0IDcuNzQgMy4xNDUuOTczIDIuMzk0LTcuNzQtMy4xNDUtLjk3M3oiIGZpbGw9IiNmZmYiLz48cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZD0iTTM3Ni40NDggMjUuNTAybC0yLjQwOS41ODZ2LTUuNDJoMi44MjZ2LTMuODA2aC0yLjgyNnYtNi4yNTVoLTMuNzE4djYuMjU1aC0zLjM0djMuNzloMy4zNHY2LjMzNWwtNC4zMDQgMS4xMTYuODkyIDMuNjE0IDMuNDQ0LS44NDN2Ny4xNDZhMS4zMzEgMS4zMzEgMCAwMS0xLjMzMyAxLjMyNWgtMi4wNzF2My42OTNoMi4xMDNhNS4wNTcgNS4wNTcgMCAwMDUuMDUxLTUuMDV2LTguMDdsMy4yNjgtLjgwMy0uOTIzLTMuNjEzek0zOTcuMTU2IDI1Ljk5MmwuMTA0LTEuODMxaC0xNS4wNTV2LTguOTA1aDExLjQ2NnYxLjgzOWExLjQ2MiAxLjQ2MiAwIDAxLTEuNDYxIDEuNDYxaC01LjkxdjMuNDYxaDUuOTM0YTQuOTIgNC45MiAwIDAwNC45MTQtNC45MjJWMTEuNzdoLTE0Ljk0M3YtLjA0OGgtMy43MzR2MzEuNzI1aDMuNzM0VjI3LjYxNGgxMS4yNDFhMTQuNDAzIDE0LjQwMyAwIDAxLTMuMjkyIDYuMDYyIDE1LjU2IDE1LjU2IDAgMDEtMy40NjktNC41MDVsLTMuMTM5IDEuNDQ2YTE4Ljc2MyAxOC43NjMgMCAwMDQuMTQzIDUuNTE2IDM4LjE3NiAzOC4xNzYgMCAwMS00Ljg2NiAzLjYxM2wxLjg0NyAyLjkyM2E0MC41NjkgNDAuNTY5IDAgMDA1LjYyLTQuMjMyIDY1Ljc3NCA2NS43NzQgMCAwMDYuNTA0IDQuNTI5bDEuODE1LTIuOTM5YTY0LjUwNiA2NC41MDYgMCAwMS01Ljg3OC00LjA2M2MyLjczOC0zLjE4IDQuMjE2LTYuNTA0IDQuNDI1LTkuOTcyek05Mi4zNCA0MS4wMjNzMS4yNDQtNC4zMDQgMS4yNDQtNS43NzN2LTMuMjEyaDIuNzd2Ny45MDloLTEuMjZ2Mi45M2gxLjY4NWEyLjk0IDIuOTQgMCAwMDIuOTQtMi45MzhWMTAuOTM2aC05LjV2MjQuMzA2YzAgMS4xOTYtLjgwMyAzLjc5OC0xLjEzMiA0Ljk1NGwtLjUxNCAxLjg1NSAzLjIxMi44NjcuNTU0LTEuODk1em0xLjIzNi0yNi4zMDVoMi43Nzh2NC44NjZoLTIuNzM4bC0uMDQtNC44NjZ6bTAgOC42NDhoMi43Nzh2NC44ODJoLTIuNzM4bC0uMDQtNC44ODJ6TTExNy41NjggMzAuMjk2di00LjA4bDIuMjU2IDEuNjcgMS4xODgtMi41Ni0zLjg4Ni0yLjg0M2gzLjYxM3YtMy4zNGgtMTAuMDI4bC44OTktMS40NzhoOS4xNjJ2LTMuNDA0aC0zLjY3OGwuNjkxLTIuNTctMy4yMTItLjg2Ny0uOTI0IDMuNDM3aC0xLjY5NHYtMy41NWgtMy4zNjR2My41NWgtMS42MDZsLS45OTYtMy40NTMtMy4yMTIuODY3LjY5MSAyLjU4NWgtMS44NzF2My40MDVoNi40MjRsLS44NzUgMS41MThoLTUuNTQ5djMuM2gyLjc4NmwtMy43ODIgMi43NDYgMS4yNjEgMi43MjIuNzQ3LS41NTR2LjA0aDExLjYwMnYyLjgzNGgtOC4yOTRsLjUzOC0xLjk5OWgtMy4wNTlsLS44MDMgMi45MDctLjY1OSAyLjQwOWgxNC44Mzl2NC44MTdhMS4wNiAxLjA2IDAgMDEtMS4wNiAxLjA2aC02LjExOHYzLjQxM2g3LjE3OGEzLjM1NyAzLjM1NyAwIDAwMy4zNjQtMy4zNTd2LTkuMjI2aC0yLjU2OXptLTQuNC03LjgxM2E2LjA1NiA2LjA1NiAwIDAwMS4zNzMgMS40NTNsLjE4NC4xNDVoLTcuNzE2YTEyLjQ0NSAxMi40NDUgMCAwMDEuNjA2LTEuNjA2bDQuNTUzLjAwOHoiIGZpbGw9IiNmZmYiLz48cGF0aCBkPSJNMTE1LjQyNCAzNWgtMTQuODMxdjMuMzU3aDE0LjgzMXYtMy4zNTZ6IiBmaWxsPSIjZmZmIi8+PHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0xNjMuMzc2IDE2LjY0NWgyNC41MTR2My4zNDloMy43ODJ2LTMuMzQ5aC4wMDh2LTMuNzgyaC0xNC4zNTd2LTIuMTUyaC0zLjc4MXYyLjE1MmgtMTMuOTQ4djcuMTNoMy43ODJ2LTMuMzQ4eiIgZmlsbD0iI2ZmZiIvPjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgY2xpcC1ydWxlPSJldmVub2RkIiBkPSJNMTc3LjYyMSAzOC4xODhsMTQuMDUxIDUuMjIgMS4zNzMtMy44Ny0xMS42NzUtNC40MjVhMjguOTczIDI4Ljk3MyAwIDAwNS44OTQtOC41MTFoNC40MTZWMjIuODJoLTE4LjI0M2wyLjQwOS00LjY2NWgtNC4yOTZsLTIuNDA5IDQuNjY1aC05LjU1NXYzLjc4Mmg3LjYwNGwtMy4wMjcgNS44MzctLjMzNy42MzUgOC45MTMgMy4zMDhjLTMuODE0IDEuOTE5LTguMTI2IDIuNjc0LTEzLjE2OSAyLjUzdjQuMDE0YzYuNzYxLjA4IDEzLjA5Ni0xLjQ4NiAxNy45MzgtNC42NTdsLjExMy0uMDh6bTQuODE3LTExLjU4NmEyNS4zNzMgMjUuMzczIDAgMDEtNS4zMzkgNi44ODFsLTcuNjc3LTIuOTA2IDIuMDY0LTMuOTc1aDEwLjk1MnpNMjI3LjYxMiAzOS41NjJoLTE0LjAzNVYzNC45MmgxMS43MzlWMzEuMTRoLTExLjczOXYtNC40NGgxMC41NTl2LTMuNzgzaC0yNS4zMTh2My43ODJoMTAuNTU5djQuNDRoLTExLjczMXYzLjc4MmgxMS43MzF2NC42NDJIMTk1LjQ3djMuNzgxaDMyLjE0MnYtMy43ODJ6IiBmaWxsPSIjZmZmIi8+PHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0yMjguMjg3IDI1LjAxMnYtNC43M2wtLjM4Ni0uMTc2YTU2LjM0OSA1Ni4zNDkgMCAwMS0xNC43MzQtOS42NjhoLTMuMzhhNTYuMzIyIDU2LjMyMiAwIDAxLTE0LjcyNiA5LjYzNmwtLjM4Ni4xNzZ2NC43M3MxMy4wODgtNy4zMzkgMTYuODA2LTEwLjY3MWMzLjcxIDMuMzU2IDE2LjgwNiAxMC43MDMgMTYuODA2IDEwLjcwM3oiIGZpbGw9IiNmZmYiLz48cGF0aCBkPSJNMTI3LjYwNiAxMC45MzVsLTIuOTY5IDIuOTcgNS43OCA1Ljc4IDIuOTY5LTIuOTctNS43OC01Ljc4eiIgZmlsbD0iI2ZmZiIvPjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgY2xpcC1ydWxlPSJldmVub2RkIiBkPSJNMTMwLjkzNyAzNS45NjR2LTE1LjM2aC03LjU0djMuNzgyaDMuNzU4djE4LjY1Mmw5LjE5NC02LjQ3MS0xLjk4My0yLjgxLTMuNDI5IDIuMjA3eiIgZmlsbD0iI2ZmZiIvPjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgY2xpcC1ydWxlPSJldmVub2RkIiBkPSJNMTU0LjUyIDM2LjI3OGE2LjM1MiA2LjM1MiAwIDAxLS45OC0yLjM2MSAxNC4yNTcgMTQuMjU3IDAgMDEtLjI5Ny0zLjIxMlYxMS4wNzNoLTIwLjAzNHY0LjE4M2g0LjU4NXY5LjU0N2gtNS4wNjZ2NC4yMDhoNS4wNjZ2MTMuODY3aDQuMlYyOS4wMWg1Ljc0OXYtNC4yMDhoLTUuNzY1di05LjU0N2g3LjU3OXYxNS4zNjljMCAuMjczLS4yNDkgNi43NzcgNC4zODUgMTAuODA3bDIuMDU1IDEuNzkxIDIuOTg3LTguNjA4LTMuNDY5LTEuMTg4LS45OTUgMi44NXoiIGZpbGw9IiNmZmYiLz48L2c+PGRlZnM+PGNsaXBQYXRoIGlkPSJjbGlwMF83MjZfMTQ1NTUxIj48cGF0aCBmaWxsPSIjZmZmIiBkPSJNMCAwaDQ2OC4wMTZ2NzRIMHoiLz48L2NsaXBQYXRoPjwvZGVmcz48L3N2Zz4=',
    exams: [],
    heroImageUrl: util.assetUrl('home/hero/504dc413-30ff-42f0-af08-2d399e703344.png'),
    leaderboard: [],
    lbMySection: [],
    lbMyRank: -1,
    lbHasGap: false,
    activeExamId: '',
    certToken: '',
    loading: true,
    lbLoading: false,
    sortKey: 'rank',
    sortAsc: true,
    expandedExam: -1,
    // 社交证明数据
    totalExams: 0,
    totalAnswers: 0,
    totalTypes: 0,
    totalModels: 0,
    // 竞技场菜单
    showArenaMenu: false,
    // 排行榜状态
    lbHasRecord: false,  // 当前登录用户是否在此exam有排行记录
    lbTotalCount: 0,     // 排行榜总人数
    // 登录引导
    showLoginGuide: false,
    showLoginPopup: false,
    pendingCopyExamId: '',  // 暂存待复制的考试ID
    examIcons: {
      v1: util.assetUrl('home/exams/v1.png'),
      v2: util.assetUrl('home/exams/v2.png'),
      v3: util.assetUrl('home/exams/v3.png')
    }
  },

  onLoad(options) {
    // 处理邀请者
    if (options.inviter) {
      const app = getApp();
      if (app.globalData.isLoggedIn) {
        api.addFriend(options.inviter).catch(() => {});
      } else {
        app.globalData.pendingInviter = options.inviter;
      }
    }
    this.loadExams();
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 });
    }
  },

  onPullDownRefresh() {
    this.loadExams().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  async loadExams() {
    try {
      const res = await api.getExams();
      if (res.ok && res.exams.length > 0) {
        const exams = res.exams.map(e => ({
          ...e,
          color: util.examColor(e.id)
        }));
        this.setData({
          exams,
          activeExamId: exams[0].id,
          loading: false
        });
        this.loadLeaderboard(exams[0].id);
        this.loadSocialProof();
      }
    } catch (e) {
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  async loadSocialProof() {
    try {
      const res = await api.getOverviewStats();
      if (res && res.ok) {
        this.setData({
          totalExams: res.shrimp_count || '-',
          totalAnswers: res.exam_count || '-',
          totalTypes: res.type_count || '-',
          totalModels: res.model_count || '-'
        });
      }
    } catch (e) {
      // 静默失败
    }
  },

  async loadLeaderboard(examId) {
    this.setData({ 
      lbLoading: true, 
      leaderboard: [], 
      lbMySection: [], 
      lbMyRank: -1, 
      lbHasGap: false,
      lbHasRecord: false,
      lbTotalCount: 0
    });
    try {
      const app = getApp();
      const uid = app.globalData.isLoggedIn ? (app.globalData.userInfo?.uid_hash || '') : '';
      const res = await api.getLeaderboard(examId, uid);
      console.log('[排行榜] examId:', examId, 'uid:', uid, 'response:', JSON.stringify(res).slice(0, 500));
      if (res && res.ok) {
        const formatItem = (item) => ({
          ...item,
          durationText: util.formatDuration(item.duration_seconds),
          percentText: Number(item.score_percent || 0).toFixed(1)
        });

        // 未登录时后端返回100条，小程序只取前10条展示
        const rawList = (res.leaderboard || []).map(formatItem);
        const lbHasRecord = res.has_record || false;
        const leaderboard = lbHasRecord ? rawList : rawList.slice(0, 10);
        const lbMySection = (res.my_section || []).map(formatItem);
        const lbMyRank = res.my_rank || -1;
        const lbHasGap = res.has_gap || false;
        const lbTotalCount = res.total_count || 0;

        this.setData({
          leaderboard,
          lbMySection,
          lbMyRank,
          lbHasGap,
          lbHasRecord,
          lbTotalCount,
          lbLoading: false,
          sortKey: 'rank',
          sortAsc: true
        });
      } else {
        console.warn('[排行榜] 返回非 ok:', res);
        this.setData({ lbLoading: false });
      }
    } catch (e) {
      console.error('[排行榜] 请求失败:', JSON.stringify(e), e.errMsg || e.message || e);
      this.setData({ lbLoading: false });
      wx.showToast({ title: '排行榜加载失败', icon: 'none', duration: 3000 });
    }
  },

  onTabSwitch(e) {
    const examId = e.currentTarget.dataset.examid;
    if (examId === this.data.activeExamId) return;
    this.setData({ activeExamId: examId });
    this.loadLeaderboard(examId);
  },

  onToggleExam(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({
      expandedExam: this.data.expandedExam === index ? -1 : index
    });
  },

  onScrollToExam() {
    this.setData({ expandedExam: 0 });
    wx.pageScrollTo({ selector: '.exam-section', duration: 300 });
  },

  onCopyCommand(e) {
    const examId = e.currentTarget.dataset.examid;
    const app = getApp();

    // 未登录时弹出登录引导
    if (!app.globalData.isLoggedIn) {
      this.setData({ showLoginGuide: true, pendingCopyExamId: examId });
      return;
    }

    this._doCopy(examId);
  },

  _doCopy(examId) {
    const app = getApp();
    let url = `${api.BASE_URL}/exam/${examId}.md`;
    if (app.globalData.isLoggedIn && app.globalData.userInfo) {
      url += `?uid=${app.globalData.userInfo.uid_hash}`;
    }
    const cmd = `请阅读 ${url} 并按照其中的指引完成考试。`;
    wx.setClipboardData({
      data: cmd,
      success() {
        wx.showToast({ title: '已复制，发送给你的龙虾吧', icon: 'none', duration: 2200 });
      }
    });
  },

  // 腾讯安全认证徽章点击 → 查看扫描证书
  onSecurityBadgeTap(e) {
    const examId = e.currentTarget.dataset.examid;
    const certUrls = {
      v1: 'https://tix.qq.com/search/skill?keyword=9ef8083278387fcdb42ba101f3cd21e7',
      v2: 'https://tix.qq.com/search/skill?keyword=9f0d49e09b8d25e038c028be9dc925cb',
      v3: 'https://tix.qq.com/search/skill?keyword=7c46e10d397ab421ee2d808953306e4c'
    };
    const url = certUrls[examId];
    if (url) {
      wx.showModal({
        title: '腾讯安全 Skill 扫描证书',
        content: '该试卷已通过腾讯安全扫描认证，点击"复制链接"可在浏览器中查看完整证书。',
        confirmText: '复制链接',
        cancelText: '关闭',
        success(res) {
          if (res.confirm) {
            wx.setClipboardData({
              data: url,
              success() {
                wx.showToast({ title: '链接已复制，请在浏览器中打开', icon: 'none', duration: 2500 });
              }
            });
          }
        }
      });
    }
  },

  // 登录引导弹框
  onCloseLoginGuide() {
    this.setData({ showLoginGuide: false, pendingCopyExamId: '' });
  },

  onLoginGuideConfirm() {
    this.setData({ showLoginGuide: false, showLoginPopup: true });
  },

  onLoginGuideSkip() {
    const examId = this.data.pendingCopyExamId;
    this.setData({ showLoginGuide: false, pendingCopyExamId: '' });
    if (examId) {
      this._doCopy(examId);
    }
  },

  onLoginPopupClose() {
    // 用户关闭登录弹窗，仍然执行复制
    const examId = this.data.pendingCopyExamId;
    this.setData({ showLoginPopup: false, pendingCopyExamId: '' });
    if (examId) {
      this._doCopy(examId);
    }
  },

  onLoginSuccess() {
    // 登录成功后执行复制（此时带uid）
    const examId = this.data.pendingCopyExamId;
    this.setData({ showLoginPopup: false, pendingCopyExamId: '' });
    if (examId) {
      this._doCopy(examId);
    }
    // 刷新排行榜以显示用户排名
    this.loadLeaderboard(this.data.activeExamId);
  },

  onCertTokenInput(e) {
    this.setData({ certToken: e.detail.value });
  },

  onSearchCert() {
    const token = this.data.certToken.trim();
    if (!token) {
      wx.showToast({ title: '请输入准考证号', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: `/pages/cert/cert?token=${token}` });
  },

  onViewCert(e) {
    const token = e.currentTarget.dataset.token;
    if (!token) {
      return;
    }
    wx.navigateTo({ url: `/pages/cert/cert?token=${token}` });
  },

  onSortLeaderboard(e) {
    const key = e.currentTarget.dataset.key;
    let { sortKey, sortAsc, leaderboard } = this.data;
    if (key === sortKey) {
      sortAsc = !sortAsc;
    } else {
      sortKey = key;
      sortAsc = key === 'rank';
    }
    leaderboard.sort((a, b) => {
      let va = a[key], vb = b[key];
      if (typeof va === 'string') {
        return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return sortAsc ? va - vb : vb - va;
    });
    this.setData({ leaderboard, sortKey, sortAsc });
  },

  onOpenArenaMenu() {
    this.setData({ showArenaMenu: true });
  },

  onCloseArenaMenu() {
    this.setData({ showArenaMenu: false });
  },

  onGoArenaList() {
    this.setData({ showArenaMenu: false });
    wx.navigateTo({ url: '/pages/arena-list/arena-list' });
  },

  onGoFriends() {
    this.setData({ showArenaMenu: false });
    wx.navigateTo({ url: '/pages/friends/friends' });
  },

  onShareAppMessage(e) {
    const app = getApp();
    const uid = app.globalData.userInfo?.uid_hash || '';
    const basePath = uid ? `/pages/index/index?inviter=${uid}` : '/pages/index/index';

    // 从邀请按钮触发时，携带考试信息
    if (e && e.from === 'button' && e.target && e.target.dataset && e.target.dataset.examid) {
      const examId = e.target.dataset.examid;
      const exam = this.data.exams.find(ex => ex.id === examId);
      const examName = exam ? exam.name : '考试';
      return {
        title: `🦞 来挑战「${examName}」！看看你的虾能考多少分？`,
        path: basePath
      };
    }

    return {
      title: '🦞 人人都在养虾，你的虾行不行？来考一场就知道了！',
      path: basePath
    };
  }
});
